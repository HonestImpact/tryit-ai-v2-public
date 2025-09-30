// Shared resources for agents - Production RAG Integration Complete
import type { LLMProvider } from './types';
import knowledgeService from '@/lib/knowledge/knowledge-singleton';
import { ToolKnowledgeService } from './tool-knowledge-service';
import { AI_CONFIG } from '@/lib/ai-config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('shared-resources');

export interface KnowledgeService {
  search(query: string, options?: { maxResults?: number; minRelevanceScore?: number }): Promise<unknown[]>;
}

export interface RAGIntegration {
  enabled: boolean;
  search(query: string, options?: { maxResults?: number; minRelevanceScore?: number }): Promise<unknown[]>;
}

export interface SolutionGenerator {
  generate(request: string): Promise<string>;
}

export interface AgentSharedResources {
  knowledgeService?: KnowledgeService;
  ragIntegration?: RAGIntegration;
  solutionGenerator?: SolutionGenerator;
  toolKnowledgeService?: ToolKnowledgeService;
}

class ProductionRAGIntegration implements RAGIntegration {
  enabled: boolean;

  constructor() {
    this.enabled = AI_CONFIG.RAG_ENABLED || false;
  }

  async search(query: string, options?: { maxResults?: number; minRelevanceScore?: number }): Promise<unknown[]> {
    if (!this.enabled) {
      logger.debug('RAG disabled, returning empty results', { query: query.substring(0, 50) });
      return [];
    }

    try {
      const results = await knowledgeService.search(query, options);
      logger.debug('RAG search completed', { 
        query: query.substring(0, 50),
        resultsCount: results.length 
      });
      return results;
    } catch (error) {
      logger.warn('RAG search failed, returning empty results', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
      return [];
    }
  }
}

class ProductionSolutionGenerator implements SolutionGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generate(request: string): Promise<string> {
    try {
      logger.debug('Generating solution', { requestLength: request.length });

      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: request }],
        system: 'You are a solution generator. Provide practical, actionable solutions to the given request.',
        model: process.env.LLM_DEFAULT_ID || 'claude-sonnet-4-20250514',
        temperature: 0.7
      });

      return result.content;
    } catch (error) {
      logger.error('Solution generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

export const sharedResourceManager = {
  async initializeResources(llmProvider: LLMProvider): Promise<AgentSharedResources> {
    try {
      logger.info('Initializing shared agent resources...');

      // Initialize RAG integration
      const ragIntegration = new ProductionRAGIntegration();
      
      // Initialize solution generator
      const solutionGenerator = new ProductionSolutionGenerator(llmProvider);

      // Initialize tool knowledge service
      const toolKnowledgeService = new ToolKnowledgeService();

      // Test RAG connectivity if enabled
      if (ragIntegration.enabled) {
        try {
          await knowledgeService.initialize();
          logger.info('✅ RAG integration initialized successfully');
        } catch (error) {
          logger.warn('RAG initialization failed, disabling RAG', {
            error: error instanceof Error ? error.message : String(error)
          });
          ragIntegration.enabled = false;
        }
      }

      const resources: AgentSharedResources = {
        knowledgeService,
        ragIntegration,
        solutionGenerator,
        toolKnowledgeService
      };

      logger.info('✅ Shared agent resources initialized', {
        ragEnabled: ragIntegration.enabled,
        knowledgeServiceAvailable: !!resources.knowledgeService,
        solutionGeneratorAvailable: !!resources.solutionGenerator,
        toolKnowledgeServiceAvailable: !!resources.toolKnowledgeService
      });

      return resources;

    } catch (error) {
      logger.error('Failed to initialize shared resources', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return minimal resources on failure
      return {
        ragIntegration: { enabled: false, search: async () => [] }
      };
    }
  }
};