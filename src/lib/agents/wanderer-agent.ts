// Wanderer Agent - Research Specialist (Simplified for initial deployment)
import { BaseAgent } from './base-agent';
import { createLogger } from '../logger';
import type { AgentSharedResources } from './shared-resources';
import type {
  AgentCapability,
  AgentRequest,
  AgentResponse,
  LLMProvider,
  AgentConfig
} from './types';

export class WandererAgent extends BaseAgent {
  private readonly logger = createLogger('wanderer-agent');

  constructor(
    llmProvider: LLMProvider,
    config: AgentConfig = {},
    _sharedResources?: AgentSharedResources // Available for future enhancement
  ) {
    const capabilities: AgentCapability[] = [
      {
        name: 'deep-research',
        description: 'Conducts comprehensive research using RAG and external sources',
        version: '1.0.0'
      }
    ];

    super('wanderer', 'Wanderer - Research Specialist', capabilities, llmProvider, {
      temperature: 0.75,
      maxTokens: 2500,
      ...config
    });
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      this.logger.info('Wanderer processing research request', {
        requestId: request.id,
        sessionId: request.sessionId
      });

      // Simplified research for initial deployment
      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: request.content }],
        system: this.getSystemPrompt(),
        model: process.env.LLM_RESEARCH_ID || process.env.LLM_DEFAULT_ID || 'claude-3-5-haiku-20241022',
        temperature: 0.75
      });

      return {
        requestId: request.id,
        agentId: this.id,
        content: result.content,
        confidence: 0.8,
        reasoning: 'Research analysis completed',
        timestamp: new Date(),
        metadata: {
          researchStrategy: 'direct-analysis',
          domain: 'general'
        }
      };

    } catch (error) {
      this.logger.error('Wanderer research failed', { error });
      return this.generateBasicResponse(request, error);
    }
  }

  protected getSystemPrompt(): string {
    return `You are Wanderer, the research specialist for Noah's multi-agent system.

Your role is to conduct thorough research and analysis on user requests. You excel at:
- Breaking down complex topics into key components
- Identifying different perspectives and approaches
- Synthesizing information into actionable insights
- Providing context for implementation decisions

Provide comprehensive, well-researched responses that give Noah's team everything they need to proceed with confidence.`;
  }
}