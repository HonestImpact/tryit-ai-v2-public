// Analytics Service - Elegant, performance-neutral analytics for Noah
// Zero-impact implementation following the Golden Rule: Best, Cleanest, Fastest, Most Logical, Most Elegant

import { createLogger } from '@/lib/logger';
import { analyticsDb } from './database';
import { generateSessionFingerprint } from './session';
import type { 
  SessionData, 
  ConversationData, 
  MessageData, 
  GeneratedToolData, 
  ToolUsageEvent 
} from './types';

const logger = createLogger('analytics-service');

/**
 * Core analytics service for Noah - designed for zero performance impact
 * All operations are async and fire-and-forget to maintain Noah's responsiveness
 */
class AnalyticsService {
  private environment: 'development' | 'preview' | 'production';
  private isEnabled: boolean;

  constructor() {
    // Detect environment elegantly
    this.environment = this.detectEnvironment();
    this.isEnabled = process.env.ANALYTICS_ENABLED !== 'false';

    if (this.isEnabled) {
      logger.info('Analytics service initialized', { 
        environment: this.environment,
        performanceImpact: 'zero' 
      });
    }
  }

  private detectEnvironment(): 'development' | 'preview' | 'production' {
    if (process.env.VERCEL_ENV === 'production') return 'production';
    if (process.env.VERCEL_ENV === 'preview') return 'preview';
    return 'development';
  }

  /**
   * Fire-and-forget session management - no performance impact
   */
  async ensureSession(userAgent?: string, ipAddress?: string): Promise<string | null> {
    if (!this.isEnabled) return null;

    // Generate session asynchronously - no blocking
    const sessionPromise = (async () => {
      try {
        const fingerprint = generateSessionFingerprint(userAgent, ipAddress, this.environment);
        const sessionData: SessionData = {
          sessionFingerprint: fingerprint,
          environment: this.environment
        };

        const sessionId = await analyticsDb.getOrCreateSession(sessionData);
        if (sessionId) {
          logger.debug('Session ensured', { sessionId: sessionId.substring(0, 8) + '...' });
        }
        return sessionId;
      } catch (error) {
        logger.error('Session creation failed - continuing without analytics', { 
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      }
    })();

    // Return promise but don't await - fire and forget
    return sessionPromise;
  }

  /**
   * Start conversation tracking with proper sequence calculation
   */
  async startConversation(
    sessionId: string,
    skepticMode: boolean = false,
    initialTrustLevel: number = 50
  ): Promise<string | null> {
    if (!this.isEnabled) return null;

    // Fire-and-forget conversation creation
    const conversationPromise = (async () => {
      try {
        const conversationData: ConversationData = {
          sessionId,
          conversationSequence: 1, // This will be recalculated properly in the database layer
          initialTrustLevel,
          skepticModeEnabled: skepticMode,
          conversationLength: 0,
          userEngagementLevel: 'medium',
          completionStatus: 'active'
        };

        const conversationId = await analyticsDb.createConversation(conversationData);
        if (conversationId) {
          logger.debug('Conversation started', { 
            conversationId: conversationId.substring(0, 8) + '...',
            skepticMode,
            initialTrustLevel
          });
        }
        return conversationId;
      } catch (error) {
        logger.error('Conversation creation failed - analytics disabled for this conversation', { 
          error: error instanceof Error ? error.message : String(error),
          sessionId: sessionId.substring(0, 8) + '...'
        });
        return null;
      }
    })();

    return conversationPromise;
  }

  /**
   * Log message - completely non-blocking
   */
  logMessage(
    conversationId: string,
    sessionId: string,
    messageSequence: number,
    role: 'user' | 'assistant',
    content: string,
    responseTimeMs?: number,
    agentInvolved?: 'noah' | 'wanderer' | 'tinkerer'
  ): void {
    if (!this.isEnabled || !conversationId) return;

    // Fire-and-forget message logging - zero performance impact
    setImmediate(async () => {
      try {
        const messageData: MessageData = {
          conversationId,
          sessionId,
          messageSequence,
          role,
          content,  // CRITICAL: Include actual content!
          contentLength: content.length,
          wordCount: this.countWords(content),
          messageType: this.inferMessageType(content, role),
          responseTimeMs,
          agentInvolved
        };

        await analyticsDb.logMessage(messageData);
        logger.debug('Message logged', { 
          role, 
          contentLength: content.length,
          responseTimeMs,
          agent: agentInvolved
        });
      } catch (error) {
        logger.error('Message logging failed', { 
          error: error instanceof Error ? error.message : String(error),
          role,
          contentLength: content.length
        });
      }
    });
  }

  /**
   * Log generated tool - async with elegant error handling
   */
  logGeneratedTool(
    conversationId: string,
    sessionId: string,
    messageId: string | undefined,
    title: string,
    content: string,
    generationTimeMs: number,
    generationAgent: 'noah' | 'wanderer' | 'tinkerer',
    userMessageLength: number,
    agentStrategy?: string
  ): void {
    if (!this.isEnabled || !conversationId) return;

    // Fire-and-forget tool logging
    setImmediate(async () => {
      try {
        const toolHash = this.generateContentHash(content);
        const toolData: GeneratedToolData = {
          conversationId,
          sessionId,
          messageId,
          toolHash,
          title,
          content,  // CRITICAL: Include actual content!
          contentLength: content.length,
          toolType: this.inferToolType(title, content),
          toolCategory: this.inferToolCategory(title, content),
          generationTimeMs,
          generationAgent,
          userMessageLength,
          agentStrategy
        };

        const toolId = await analyticsDb.logGeneratedTool(toolData);
        if (toolId) {
          // Log initial "generated" event
          await this.logToolUsage(toolId, sessionId, 'generated');
          
          logger.debug('Tool generated and logged', { 
            title,
            contentLength: content.length,
            generationTimeMs,
            agent: generationAgent,
            toolId: toolId.substring(0, 8) + '...'
          });
        }
      } catch (error) {
        logger.error('Tool logging failed', { 
          error: error instanceof Error ? error.message : String(error),
          title,
          contentLength: content.length
        });
      }
    });
  }

  /**
   * Log tool usage event - for adoption tracking
   */
  async logToolUsage(
    toolId: string,
    sessionId: string,
    eventType: 'generated' | 'viewed' | 'interacted' | 'downloaded' | 'shared' | 'reused',
    interactionDurationMs?: number
  ): Promise<void> {
    if (!this.isEnabled) return;

    // Fire-and-forget usage logging
    setImmediate(async () => {
      try {
        const eventData: ToolUsageEvent = {
          toolId,
          sessionId,
          eventType,
          usageContext: eventType === 'reused' ? 'different-session' : 'same-session',
          interactionDurationMs
        };

        await analyticsDb.logToolUsageEvent(eventData);
        logger.debug('Tool usage logged', { 
          eventType,
          toolId: toolId.substring(0, 8) + '...',
          duration: interactionDurationMs
        });
      } catch (error) {
        logger.error('Tool usage logging failed', { 
          error: error instanceof Error ? error.message : String(error),
          eventType,
          toolId: toolId.substring(0, 8) + '...'
        });
      }
    });
  }

  /**
   * Complete conversation - update final status and metrics
   */
  completeConversation(
    conversationId: string,
    status: 'completed' | 'abandoned' | 'error',
    finalTrustLevel?: number
  ): void {
    if (!this.isEnabled || !conversationId) return;

    // Fire-and-forget completion logging
    setImmediate(async () => {
      try {
        await analyticsDb.updateConversationStatus(conversationId, status, finalTrustLevel);
        logger.debug('Conversation completed', { 
          conversationId: conversationId.substring(0, 8) + '...',
          status,
          finalTrustLevel
        });
      } catch (error) {
        logger.error('Conversation completion logging failed', { 
          error: error instanceof Error ? error.message : String(error),
          status
        });
      }
    });
  }

  /**
   * Health check for analytics system
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.isEnabled) {
      return { healthy: true, message: 'Analytics disabled' };
    }

    try {
      const dbHealthy = await analyticsDb.healthCheck();
      return {
        healthy: dbHealthy,
        message: dbHealthy ? 'Analytics system operational' : 'Database connection issues'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Analytics health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // === PRIVATE UTILITY METHODS ===

  private countWords(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  private inferMessageType(content: string, role: 'user' | 'assistant'): 'question' | 'request' | 'challenge' | 'feedback' | 'response' | 'tool-generation' | undefined {
    if (role === 'user') {
      const contentLower = content.toLowerCase();
      if (contentLower.includes('?')) return 'question';
      if (contentLower.includes('create') || contentLower.includes('build') || contentLower.includes('make')) return 'request';
      if (contentLower.includes('wrong') || contentLower.includes('disagree') || contentLower.includes('not right')) return 'challenge';
      return 'request';
    } else {
      if (content.includes('TITLE:') && content.includes('TOOL:')) return 'tool-generation';
      return 'response';
    }
  }

  private inferToolType(title: string, content: string): string {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    if (titleLower.includes('calculator') || contentLower.includes('calculate')) return 'calculator';
    if (titleLower.includes('converter') || contentLower.includes('convert')) return 'converter';
    if (titleLower.includes('timer') || contentLower.includes('timer')) return 'timer';
    if (titleLower.includes('form') || contentLower.includes('<form')) return 'form';
    if (titleLower.includes('game') || contentLower.includes('game')) return 'game';
    if (titleLower.includes('chart') || titleLower.includes('graph') || contentLower.includes('chart')) return 'visualization';
    if (contentLower.includes('<canvas') || contentLower.includes('chart.js')) return 'visualization';

    return 'general';
  }

  private inferToolCategory(title: string, content: string): string {
    const toolType = this.inferToolType(title, content);
    
    if (['calculator', 'converter'].includes(toolType)) return 'utility';
    if (['timer', 'form'].includes(toolType)) return 'productivity';
    if (['game'].includes(toolType)) return 'entertainment';
    if (['visualization'].includes(toolType)) return 'data';
    
    return 'general';
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Export singleton instance for consistent analytics access throughout Noah
export const analyticsService = new AnalyticsService();