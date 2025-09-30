/**
 * Noah RAG Embeddings Service
 * Handles text embedding generation for semantic search
 */

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { createLogger } from '@/lib/logger';

const logger = createLogger('embeddings');

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export class EmbeddingService {
  private readonly model = 'text-embedding-3-small'; // OpenAI's latest embedding model
  private readonly maxChunkSize = 8192; // Maximum tokens per chunk

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      logger.info('🔢 Generating embedding', { 
        textLength: text.length,
        preview: text.substring(0, 100)
      });

      const result = await embed({
        model: openai.embedding(this.model),
        value: text
      });

      logger.info('✅ Embedding generated', { 
        dimensions: result.embedding.length,
        usage: result.usage
      });

      return {
        embedding: result.embedding,
        tokens: result.usage?.tokens || 0
      };

    } catch (error) {
      logger.error('💥 Failed to generate embedding', { 
        error, 
        textLength: text.length 
      });
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    logger.info('🔢 Generating batch embeddings', { count: texts.length });

    const results: EmbeddingResult[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Small delay between batches to be respectful of rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('✅ Batch embeddings completed', { count: results.length });
    return results;
  }

  /**
   * Calculate similarity between two embeddings using cosine similarity
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(-1, Math.min(1, similarity)); // Clamp to [-1, 1]
  }

  /**
   * Split long text into chunks that fit within embedding model limits
   */
  splitTextIntoChunks(text: string, chunkSize: number = this.maxChunkSize): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let endIndex = currentIndex + chunkSize;
      
      // Try to break at a sentence boundary
      if (endIndex < text.length) {
        const lastSentenceEnd = text.lastIndexOf('.', endIndex);
        const lastNewLine = text.lastIndexOf('\n', endIndex);
        const breakPoint = Math.max(lastSentenceEnd, lastNewLine);
        
        if (breakPoint > currentIndex) {
          endIndex = breakPoint + 1;
        }
      }

      chunks.push(text.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Health check for the embedding service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateEmbedding('Health check test');
      return true;
    } catch (error) {
      logger.error('💥 Embedding service health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();