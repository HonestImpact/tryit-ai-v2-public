// Intelligent Error Handling - Premium error recovery and user communication
// Replaces generic "technical difficulties" with contextual, actionable responses

import { createLogger } from '@/lib/logger';
import { analyticsService } from '@/lib/analytics';

const logger = createLogger('intelligent-errors');

export interface ErrorContext {
  operation: string;
  agentInvolved: 'noah' | 'wanderer' | 'tinkerer';
  requestType: 'conversation' | 'research' | 'tool-generation' | 'analysis';
  userMessageLength: number;
  sessionId?: string;
  conversationId?: string;
  attemptNumber?: number;
  originalError?: Error;
}

export interface ErrorResponse {
  userMessage: string;
  internalReason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'retry' | 'escalate' | 'fallback' | 'user-intervention';
  fallbackStrategy?: string;
  retryDelay?: number;
  escalationPath?: string;
}

export interface ErrorAnalytics {
  errorType: string;
  errorCategory: 'timeout' | 'llm-failure' | 'parsing-error' | 'database-error' | 'network-error' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: 'auto-resolved' | 'user-notified' | 'escalated' | 'failed';
  resolutionTimeMs?: number;
}

export class IntelligentErrorHandler {
  /**
   * Handle error with context-aware response generation
   */
  static handleError(context: ErrorContext): ErrorResponse {
    try {
      // Analyze error pattern and generate appropriate response
      const errorAnalysis = this.analyzeError(context);
      const response = this.generateContextualResponse(context, errorAnalysis);

      // Log error analytics (fire-and-forget)
      this.logErrorAnalytics(context, errorAnalysis, response);

      logger.info('Intelligent error handled', {
        operation: context.operation,
        agent: context.agentInvolved,
        severity: response.severity,
        suggestedAction: response.suggestedAction,
        sessionId: context.sessionId?.substring(0, 8) + '...'
      });

      return response;

    } catch (handlerError) {
      logger.error('Error handler itself failed', {
        handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError),
        originalError: context.originalError?.message
      });

      // Ultimate fallback when error handler fails
      return this.getUltimateFallback(context);
    }
  }

  /**
   * Analyze error patterns to determine appropriate response strategy
   */
  private static analyzeError(context: ErrorContext): ErrorAnalytics {
    const error = context.originalError;
    let errorType = 'unknown';
    let errorCategory: ErrorAnalytics['errorCategory'] = 'unknown';
    let severity: ErrorAnalytics['severity'] = 'medium';

    if (error) {
      const errorMessage = error.message.toLowerCase();

      // Timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorType = 'operation-timeout';
        errorCategory = 'timeout';
        severity = context.agentInvolved === 'noah' ? 'high' : 'medium';
      }
      // LLM provider errors
      else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        errorType = 'rate-limit-exceeded';
        errorCategory = 'llm-failure';
        severity = 'high';
      }
      else if (errorMessage.includes('model') || errorMessage.includes('anthropic') || errorMessage.includes('openai')) {
        errorType = 'llm-provider-error';
        errorCategory = 'llm-failure';
        severity = 'high';
      }
      // Network errors
      else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
        errorType = 'network-connectivity';
        errorCategory = 'network-error';
        severity = 'medium';
      }
      // Database errors
      else if (errorMessage.includes('database') || errorMessage.includes('postgresql') || errorMessage.includes('pool')) {
        errorType = 'database-connectivity';
        errorCategory = 'database-error';
        severity = 'low'; // Analytics database issues are non-critical
      }
      // Parsing errors
      else if (errorMessage.includes('parse') || errorMessage.includes('json') || errorMessage.includes('invalid')) {
        errorType = 'response-parsing';
        errorCategory = 'parsing-error';
        severity = 'medium';
      }
    }

    return {
      errorType,
      errorCategory,
      severity,
      resolution: 'auto-resolved' // Will be updated based on actual resolution
    };
  }

  /**
   * Generate contextual, helpful response based on error analysis
   */
  private static generateContextualResponse(context: ErrorContext, analysis: ErrorAnalytics): ErrorResponse {
    const { operation, agentInvolved, requestType } = context;
    const { errorCategory, severity } = analysis;

    // Agent-specific responses
    const agentNames = {
      noah: "I",
      wanderer: "my research specialist",
      tinkerer: "my technical implementation specialist"
    };

    const agentName = agentNames[agentInvolved];

    switch (errorCategory) {
      case 'timeout':
        return {
          userMessage: `${agentName} need${agentInvolved === 'noah' ? '' : 's'} a bit more time for this ${requestType}. Let me try a different approach that's optimized for speed.`,
          internalReason: `${operation} timeout - need faster processing strategy`,
          severity,
          suggestedAction: 'fallback',
          fallbackStrategy: 'use-faster-model-or-simpler-approach',
          retryDelay: 1000
        };

      case 'llm-failure':
        if (analysis.errorType === 'rate-limit-exceeded') {
          return {
            userMessage: `I'm experiencing high demand right now. Let me try again in just a moment with an optimized approach.`,
            internalReason: 'LLM rate limit exceeded - need backoff strategy',
            severity,
            suggestedAction: 'retry',
            retryDelay: 5000,
            fallbackStrategy: 'switch-to-alternative-provider'
          };
        }
        return {
          userMessage: `${agentName} encountered a brief connection issue with ${agentInvolved === 'noah' ? 'my' : 'the'} processing system. Let me reconnect and try again.`,
          internalReason: 'LLM provider connectivity issue',
          severity,
          suggestedAction: 'retry',
          retryDelay: 2000,
          fallbackStrategy: 'switch-provider-or-model'
        };

      case 'network-error':
        return {
          userMessage: `There was a brief network hiccup. I'm reconnecting and will have your response ready shortly.`,
          internalReason: 'Network connectivity issue during operation',
          severity,
          suggestedAction: 'retry',
          retryDelay: 3000
        };

      case 'parsing-error':
        return {
          userMessage: `${agentName} generated a response in an unexpected format. Let me restructure that response for you.`,
          internalReason: 'Response parsing failed - need format correction',
          severity,
          suggestedAction: 'fallback',
          fallbackStrategy: 'use-structured-response-format'
        };

      case 'database-error':
        return {
          userMessage: `Everything is working perfectly! I just had a minor issue with my analytics system, but that won't affect your experience.`,
          internalReason: 'Analytics database error - non-critical to user experience',
          severity,
          suggestedAction: 'fallback',
          fallbackStrategy: 'continue-without-analytics'
        };

      default:
        // Sophisticated fallback for unknown errors
        if (requestType === 'tool-generation') {
          return {
            userMessage: `I encountered an unexpected issue while building your tool. Let me try a different development approach that's more reliable.`,
            internalReason: 'Unknown error during tool generation',
            severity,
            suggestedAction: 'fallback',
            fallbackStrategy: 'use-simpler-tool-generation-strategy'
          };
        } else if (requestType === 'research') {
          return {
            userMessage: `${agentName} hit an unexpected snag during research. Let me approach this from a different angle.`,
            internalReason: 'Unknown error during research operation',
            severity,
            suggestedAction: 'fallback',
            fallbackStrategy: 'use-direct-analysis-instead-of-rag'
          };
        } else {
          return {
            userMessage: `I encountered something unexpected while processing your request. Let me try a different approach that should work more smoothly.`,
            internalReason: 'Unknown error - general fallback needed',
            severity,
            suggestedAction: 'fallback',
            fallbackStrategy: 'use-conservative-processing-approach'
          };
        }
    }
  }

  /**
   * Log error analytics for monitoring and improvement
   */
  private static logErrorAnalytics(
    context: ErrorContext, 
    analysis: ErrorAnalytics, 
    response: ErrorResponse
  ): void {
    // Fire-and-forget analytics logging
    const logData = {
      operation: context.operation,
      agentInvolved: context.agentInvolved,
      requestType: context.requestType,
      errorType: analysis.errorType,
      errorCategory: analysis.errorCategory,
      severity: analysis.severity,
      suggestedAction: response.suggestedAction,
      fallbackStrategy: response.fallbackStrategy,
      userMessageLength: context.userMessageLength,
      attemptNumber: context.attemptNumber || 1,
      timestamp: new Date().toISOString()
    };

    logger.error('Intelligent error analytics', logData);

    // TODO: Send to analytics service when error tracking is implemented
    // analyticsService.logErrorEvent(context.sessionId, context.conversationId, logData);
  }

  /**
   * Ultimate fallback when error handler itself fails
   */
  private static getUltimateFallback(context: ErrorContext): ErrorResponse {
    return {
      userMessage: `I encountered an unexpected situation while processing your ${context.requestType}. I'm working to resolve this quickly and will have a response for you soon.`,
      internalReason: 'Error handler cascade failure - using ultimate fallback',
      severity: 'critical',
      suggestedAction: 'escalate',
      escalationPath: 'manual-intervention-required'
    };
  }

  /**
   * Handle agent-specific escalation scenarios
   */
  static handleAgentFailure(
    agentType: 'noah' | 'wanderer' | 'tinkerer',
    context: ErrorContext
  ): ErrorResponse {
    logger.warn(`Agent failure detected`, {
      agentType,
      operation: context.operation,
      attemptNumber: context.attemptNumber
    });

    switch (agentType) {
      case 'wanderer':
        return {
          userMessage: `My research specialist is temporarily unavailable. I'll handle your research request directly with my core knowledge.`,
          internalReason: 'Wanderer agent failure - fallback to Noah direct',
          severity: 'medium',
          suggestedAction: 'fallback',
          fallbackStrategy: 'noah-direct-research'
        };

      case 'tinkerer':
        return {
          userMessage: `My technical specialist is experiencing an issue. I'll create your tool using my foundational capabilities instead.`,
          internalReason: 'Tinkerer agent failure - fallback to Noah direct',
          severity: 'medium',
          suggestedAction: 'fallback',
          fallbackStrategy: 'noah-direct-tool-generation'
        };

      case 'noah':
        return {
          userMessage: `I'm experiencing a brief processing issue. Give me just a moment to reinitialize my systems and I'll be right back with you.`,
          internalReason: 'Noah core failure - need system recovery',
          severity: 'high',
          suggestedAction: 'escalate',
          escalationPath: 'noah-system-recovery',
          retryDelay: 5000
        };

      default:
        return this.getUltimateFallback(context);
    }
  }
}