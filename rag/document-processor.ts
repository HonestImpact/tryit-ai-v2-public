/**
 * Noah RAG Document Processor
 * Handles document ingestion, chunking, and preparation for vector storage
 */

import { createLogger } from '@/lib/logger';
import { embeddingService } from './embeddings';
import { vectorStore } from './vector-store';

const logger = createLogger('document-processor');

interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'knowledge' | 'artifact' | 'conversation';
    title?: string;
    category?: string;
    tags?: string[];
    timestamp: string;
  };
}

interface ProcessedChunk {
  id: string;
  content: string;
  metadata: Document['metadata'] & {
    chunkIndex: number;
    totalChunks: number;
    parentDocumentId: string;
  };
  embedding?: number[];
}

export class DocumentProcessor {
  private readonly chunkSize = 1000; // Characters per chunk
  private readonly chunkOverlap = 200; // Overlap between chunks

  /**
   * Process a single document for RAG ingestion
   */
  async processDocument(document: Document): Promise<void> {
    try {
      logger.info('📄 Processing document for RAG', { 
        id: document.id,
        type: document.metadata.type,
        contentLength: document.content.length
      });

      // Split document into chunks
      const chunks = this.createChunks(document);
      
      // Generate embeddings for each chunk
      const processedChunks = await this.generateChunkEmbeddings(chunks);

      // Store in vector database
      await vectorStore.addDocuments(processedChunks);

      logger.info('✅ Document processed successfully', { 
        id: document.id,
        chunksCreated: chunks.length
      });

    } catch (error) {
      logger.error('💥 Document processing failed', { 
        error, 
        documentId: document.id 
      });
      throw error;
    }
  }

  /**
   * Process multiple documents in batch
   */
  async processDocuments(documents: Document[]): Promise<void> {
    logger.info('📚 Processing document batch', { count: documents.length });

    for (const document of documents) {
      try {
        await this.processDocument(document);
      } catch (error) {
        logger.error('💥 Failed to process document in batch', { 
          error, 
          documentId: document.id 
        });
        // Continue with other documents even if one fails
      }
    }

    logger.info('✅ Document batch processing completed');
  }

  /**
   * Create text chunks from a document
   */
  private createChunks(document: Document): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const content = document.content;
    
    if (content.length <= this.chunkSize) {
      // Document is small enough to be a single chunk
      chunks.push({
        id: `${document.id}_chunk_0`,
        content: content,
        metadata: {
          ...document.metadata,
          chunkIndex: 0,
          totalChunks: 1,
          parentDocumentId: document.id
        }
      });
      return chunks;
    }

    // Split into overlapping chunks
    let currentIndex = 0;
    let chunkIndex = 0;

    while (currentIndex < content.length) {
      const endIndex = Math.min(currentIndex + this.chunkSize, content.length);
      let chunkContent = content.slice(currentIndex, endIndex);

      // Try to break at word boundaries
      if (endIndex < content.length) {
        const lastSpaceIndex = chunkContent.lastIndexOf(' ');
        if (lastSpaceIndex > this.chunkSize * 0.5) {
          chunkContent = chunkContent.slice(0, lastSpaceIndex);
        }
      }

      chunks.push({
        id: `${document.id}_chunk_${chunkIndex}`,
        content: chunkContent.trim(),
        metadata: {
          ...document.metadata,
          chunkIndex,
          totalChunks: 0, // Will be updated after all chunks are created
          parentDocumentId: document.id
        }
      });

      // Move to next chunk with overlap
      currentIndex += chunkContent.length - this.chunkOverlap;
      if (currentIndex >= content.length) break;
      chunkIndex++;
    }

    // Update total chunks count for all chunks
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    logger.info('📄 Document chunked', { 
      documentId: document.id,
      originalLength: content.length,
      chunksCreated: chunks.length
    });

    return chunks;
  }

  /**
   * Generate embeddings for document chunks
   */
  private async generateChunkEmbeddings(chunks: ProcessedChunk[]): Promise<ProcessedChunk[]> {
    logger.info('🔢 Generating embeddings for chunks', { count: chunks.length });

    const embeddings = await embeddingService.generateEmbeddings(
      chunks.map(chunk => chunk.content)
    );

    const processedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index].embedding
    }));

    logger.info('✅ Chunk embeddings generated', { count: processedChunks.length });
    return processedChunks;
  }

  /**
   * Update an existing document
   */
  async updateDocument(document: Document): Promise<void> {
    try {
      logger.info('🔄 Updating document', { id: document.id });

      // Delete existing chunks for this document
      await this.deleteDocumentChunks(document.id);

      // Process the updated document
      await this.processDocument(document);

      logger.info('✅ Document updated successfully', { id: document.id });

    } catch (error) {
      logger.error('💥 Document update failed', { error, documentId: document.id });
      throw error;
    }
  }

  /**
   * Delete all chunks for a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.deleteDocumentChunks(documentId);
      logger.info('✅ Document deleted', { id: documentId });
    } catch (error) {
      logger.error('💥 Document deletion failed', { error, documentId });
      throw error;
    }
  }

  /**
   * Delete all chunks for a specific document
   */
  private async deleteDocumentChunks(documentId: string): Promise<void> {
    // Search for all chunks belonging to this document
    const searchResults = await vectorStore.search('', {
      maxResults: 1000,
      minRelevanceScore: 0,
      filter: { parentDocumentId: documentId }
    });

    if (searchResults.length > 0) {
      const chunkIds = searchResults.map(result => result.id);
      await vectorStore.deleteDocuments(chunkIds);
      logger.info('🗑️ Deleted document chunks', { documentId, chunksDeleted: chunkIds.length });
    }
  }

  /**
   * Extract text content from various document formats
   */
  extractContent(data: string, format: 'text' | 'markdown' | 'html' | 'json'): string {
    switch (format) {
      case 'text':
        return data;
      
      case 'markdown':
        // Simple markdown processing - remove headers, links, etc.
        return data
          .replace(/#{1,6}\s+/g, '') // Remove headers
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1') // Remove italic
          .replace(/`([^`]+)`/g, '$1') // Remove inline code
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .trim();
      
      case 'html':
        // Simple HTML tag removal
        return data
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      
      case 'json':
        try {
          const parsed = JSON.parse(data);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return data;
        }
      
      default:
        return data;
    }
  }

  /**
   * Create a document from a conversation
   */
  createConversationDocument(
    sessionId: string,
    messages: Array<{ role: string; content: string; timestamp: Date }>
  ): Document {
    const content = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    return {
      id: `conversation_${sessionId}_${Date.now()}`,
      content,
      metadata: {
        source: 'conversation',
        type: 'conversation',
        title: `Conversation ${sessionId}`,
        category: 'chat_history',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a document from an artifact
   */
  createArtifactDocument(
    artifactId: string,
    title: string,
    content: string,
    type: string
  ): Document {
    return {
      id: `artifact_${artifactId}`,
      content: `Title: ${title}\n\nType: ${type}\n\nContent:\n${content}`,
      metadata: {
        source: 'artifact',
        type: 'artifact',
        title,
        category: type,
        tags: [type, 'artifact'],
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();