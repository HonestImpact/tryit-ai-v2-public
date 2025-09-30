/**
 * Noah RAG System - Main Export File
 * Centralized exports for the Retrieval-Augmented Generation system
 */

// Core RAG components
export { vectorStore } from './vector-store';
export { embeddingService } from './embeddings';
export { documentProcessor } from './document-processor';

// Import for internal use
import { vectorStore } from './vector-store';
import { embeddingService } from './embeddings';
import { documentProcessor } from './document-processor';

// Re-export knowledge service from lib
export { default as knowledgeService } from '../src/lib/knowledge/knowledge-singleton';

// Types
export type {
  DocumentChunk,
  SearchResult
} from './vector-store';

export type {
  EmbeddingResult
} from './embeddings';

/**
 * RAG System Manager - Provides high-level orchestration
 */
class RAGSystem {
  private initialized = false;

  /**
   * Initialize the entire RAG system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize vector store
      await vectorStore.initialize();
      
      // Test embeddings service
      await embeddingService.healthCheck();
      
      this.initialized = true;
      console.log('✅ RAG System initialized successfully');

    } catch (error) {
      console.error('💥 RAG System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add documents to the RAG system
   */
  async addDocuments(documents: Array<{
    id: string;
    content: string;
    metadata: {
      source: string;
      type: 'knowledge' | 'artifact' | 'conversation';
      title?: string;
      category?: string;
      timestamp: string;
    };
  }>): Promise<void> {
    await this.initialize();
    await documentProcessor.processDocuments(documents);
  }

  /**
   * Search the knowledge base
   */
  async search(query: string, options?: {
    maxResults?: number;
    minRelevanceScore?: number;
    filter?: Record<string, unknown>;
  }) {
    await this.initialize();
    return await vectorStore.search(query, options);
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<{
    vectorStore: boolean;
    embeddings: boolean;
    documentCount: number;
  }> {
    const vectorStoreHealth = await vectorStore.healthCheck();
    const embeddingsHealth = await embeddingService.healthCheck();
    const stats = await vectorStore.getStats();

    return {
      vectorStore: vectorStoreHealth,
      embeddings: embeddingsHealth,
      documentCount: stats.count
    };
  }

  /**
   * Reset the RAG system (for development/testing)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting RAG system...');
    this.initialized = false;
    // Note: Actual data deletion would require more careful implementation
    await this.initialize();
  }
}

// Export singleton RAG system manager
export const ragSystem = new RAGSystem();