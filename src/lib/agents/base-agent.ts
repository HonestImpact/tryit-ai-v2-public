// Base agent class for all Noah agents with intelligent error handling
import type { AgentCapability, AgentRequest, AgentResponse, LLMProvider, AgentConfig } from './types';
import { IntelligentErrorHandler, type ErrorContext } from '@/lib/error-handling/intelligent-errors';

export abstract class BaseAgent {
  protected constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly capabilities: AgentCapability[],
    protected readonly llmProvider: LLMProvider,
    protected readonly config: AgentConfig
  ) {}

  abstract processRequest(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Generate intelligent error response with context awareness
   */
  protected generateBasicResponse(request: AgentRequest, error?: unknown): AgentResponse {
    const errorContext: ErrorContext = {
      operation: `${this.id}-process-request`,
      agentInvolved: this.id as 'noah' | 'wanderer' | 'tinkerer',
      requestType: this.inferRequestType(request.content),
      userMessageLength: request.content.length,
      sessionId: request.sessionId,
      originalError: error instanceof Error ? error : undefined
    };

    const errorResponse = IntelligentErrorHandler.handleError(errorContext);

    return {
      requestId: request.id,
      agentId: this.id,
      content: errorResponse.userMessage,
      confidence: 0.3,
      reasoning: errorResponse.internalReason,
      timestamp: new Date(),
      metadata: { 
        error: true,
        errorSeverity: errorResponse.severity,
        suggestedAction: errorResponse.suggestedAction,
        fallbackStrategy: errorResponse.fallbackStrategy
      }
    };
  }

  /**
   * Infer request type from content for better error handling
   */
  private inferRequestType(content: string): 'conversation' | 'research' | 'tool-generation' | 'analysis' {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('create') || contentLower.includes('build') || contentLower.includes('make') || contentLower.includes('generate')) {
      return 'tool-generation';
    }
    
    if (contentLower.includes('research') || contentLower.includes('find') || contentLower.includes('search') || contentLower.includes('investigate')) {
      return 'research';
    }
    
    if (contentLower.includes('analyze') || contentLower.includes('explain') || contentLower.includes('why') || contentLower.includes('how')) {
      return 'analysis';
    }
    
    return 'conversation';
  }

  protected getSystemPrompt(): string {
    return `You are ${this.name}, an AI agent with these capabilities: ${this.capabilities.map(c => c.name).join(', ')}.`;
  }
}