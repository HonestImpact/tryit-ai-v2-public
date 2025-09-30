/**
 * Noah RAG Vector Store - ChromaDB Integration
 * Provides vector storage and semantic search capabilities for the Noah agent system
 */

import { ChromaClient } from 'chromadb';
import { createLogger } from '@/lib/logger';
import { AI_CONFIG } from '@/lib/ai-config';

const logger = createLogger('vector-store');

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'knowledge' | 'artifact' | 'conversation';
    timestamp: string;
    category?: string;
  };
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: DocumentChunk['metadata'];
}

export class VectorStore {
  private client: ChromaClient;
  private collection: { 
    add: (data: { ids: string[]; documents: string[]; metadatas: Record<string, unknown>[] }) => Promise<void>;
    query: (params: { queryTexts: string[]; nResults: number; where?: Record<string, unknown> }) => Promise<{ documents?: string[][]; distances?: number[][]; metadatas?: Record<string, unknown>[][]; ids?: string[][] }>;
    count: () => Promise<number>;
    update: (data: { ids: string[]; documents: string[]; metadatas: Record<string, unknown>[] }) => Promise<void>;
    delete: (params: { ids: string[] }) => Promise<void>;
  } | null = null;
  private readonly collectionName = 'noah-knowledge-base';
  private initialized = false;

  constructor() {
    // Initialize ChromaDB client
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
  }

  /**
   * Initialize the vector store and create collection if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🔗 Initializing ChromaDB vector store...');

      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        }) as typeof this.collection;
        logger.info('✅ Connected to existing ChromaDB collection');
      } catch {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'Noah agent knowledge base for RAG operations',
            created: new Date().toISOString()
          }
        }) as typeof this.collection;
        logger.info('✅ Created new ChromaDB collection');
      }

      this.initialized = true;
      logger.info('🎉 Vector store initialized successfully');

    } catch (error) {
      logger.error('💥 Failed to initialize vector store', { error });
      throw new Error(`Vector store initialization failed: ${error}`);
    }
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      logger.info('📝 Adding documents to vector store', { count: documents.length });

      const ids = documents.map(doc => doc.id);
      const contents = documents.map(doc => doc.content);
      const metadatas = documents.map(doc => doc.metadata);

      await this.collection.add({
        ids,
        documents: contents,
        metadatas
      });

      logger.info('✅ Documents added successfully', { count: documents.length });

    } catch (error) {
      logger.error('💥 Failed to add documents', { error, count: documents.length });
      throw error;
    }
  }

  /**
   * Search for similar documents using semantic similarity
   */
  async search(query: string, options: {
    maxResults?: number;
    minRelevanceScore?: number;
    filter?: Record<string, unknown>;
  } = {}): Promise<SearchResult[]> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    const {
      maxResults = AI_CONFIG.RAG_CONTEXT_LIMIT,
      minRelevanceScore = AI_CONFIG.RAG_RELEVANCE_THRESHOLD,
      filter = {}
    } = options;

    try {
      logger.info('🔍 Searching vector store', { query: query.substring(0, 100), maxResults });

      const results = await this.collection.query({
        queryTexts: [query],
        nResults: maxResults,
        where: Object.keys(filter).length > 0 ? filter : undefined
      });

      if (!results.documents?.[0] || !results.distances?.[0] || !results.metadatas?.[0] || !results.ids?.[0]) {
        return [];
      }

      const searchResults: SearchResult[] = [];
      
      for (let i = 0; i < results.documents[0].length; i++) {
        const distance = results.distances[0][i];
        const score = distance !== null ? 1 - distance : 0; // Convert distance to similarity score

        if (score >= minRelevanceScore) {
          searchResults.push({
            id: results.ids[0][i] as string,
            content: results.documents[0][i] as string,
            score,
            metadata: results.metadatas[0][i] as DocumentChunk['metadata']
          });
        }
      }

      logger.info('✅ Search completed', { 
        resultsFound: searchResults.length,
        filteredByScore: results.documents[0].length - searchResults.length
      });

      return searchResults.sort((a, b) => b.score - a.score);

    } catch (error) {
      logger.error('💥 Vector search failed', { error, query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Update existing document
   */
  async updateDocument(id: string, content: string, metadata: DocumentChunk['metadata']): Promise<void> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.collection.update({
        ids: [id],
        documents: [content],
        metadatas: [metadata]
      });

      logger.info('✅ Document updated', { id });

    } catch (error) {
      logger.error('💥 Failed to update document', { error, id });
      throw error;
    }
  }

  /**
   * Delete documents by ID
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.collection.delete({
        ids
      });

      logger.info('✅ Documents deleted', { count: ids.length });

    } catch (error) {
      logger.error('💥 Failed to delete documents', { error, count: ids.length });
      throw error;
    }
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<{ count: number; name: string }> {
    await this.initialize();

    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      const count = await this.collection.count();
      return {
        count,
        name: this.collectionName
      };
    } catch (error) {
      logger.error('💥 Failed to get stats', { error });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      if (this.collection) {
        await this.collection.count();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('💥 Vector store health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const vectorStore = new VectorStore();