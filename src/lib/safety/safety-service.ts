/**
 * Noah Safety Service - Orchestrates content filtering with Trust Recovery Protocol
 * Handles radio silence and safety analytics integration
 */

import { NoahContentFilter, type SafetyCheckResult, type SafetyContext } from './content-filter';
import { createLogger } from '@/lib/logger';
import { analyticsService } from '@/lib/analytics';

const logger = createLogger('noah-safety-service');

export interface SafetyResponse {
  shouldProceed: boolean;
  interfaceLocked: boolean;
  radioSilence: boolean;
  violation?: {
    type: string;
    reason: string;
    confidence: number;
  };
  loggedToAnalytics: boolean;
}

export class NoahSafetyService {
  
  /**
   * Primary safety check for incoming user messages
   * Returns whether Noah should proceed with generating a response
   */
  static async checkUserMessage(
    userMessage: string,
    sessionId?: string,
    conversationId?: string,
    conversationHistory?: string[]
  ): Promise<SafetyResponse> {
    
    const startTime = Date.now();
    
    const context: SafetyContext = {
      userMessage,
      conversationHistory,
      sessionId
    };

    // Run comprehensive safety check
    const safetyResult = NoahContentFilter.checkContent(context);
    
    // Log safety check to analytics (fire-and-forget)
    const analyticsLogged = await this.logSafetyCheck(
      safetyResult,
      userMessage,
      sessionId,
      conversationId,
      Date.now() - startTime
    );

    if (safetyResult.radioSilence) {
      logger.warn('Interface lockdown activated', {
        violationType: safetyResult.violationType,
        reason: safetyResult.reason,
        confidence: safetyResult.confidence,
        sessionId: sessionId?.substring(0, 8) + '...',
        messageLength: userMessage.length
      });

      return {
        shouldProceed: false,
        interfaceLocked: true,
        radioSilence: true,
        violation: {
          type: safetyResult.violationType!,
          reason: safetyResult.reason!,
          confidence: safetyResult.confidence
        },
        loggedToAnalytics: analyticsLogged
      };
    }

    // Content is safe - proceed with normal processing
    logger.debug('Content approved for processing', {
      confidence: safetyResult.confidence,
      sessionId: sessionId?.substring(0, 8) + '...',
      checkDuration: Date.now() - startTime
    });

    return {
      shouldProceed: true,
      interfaceLocked: false,
      radioSilence: false,
      loggedToAnalytics: analyticsLogged
    };
  }

  /**
   * Log safety check to analytics for Trust Recovery Protocol tracking
   */
  private static async logSafetyCheck(
    safetyResult: SafetyCheckResult,
    userMessage: string,
    sessionId?: string,
    conversationId?: string,
    checkDurationMs?: number
  ): Promise<boolean> {
    try {
      // Log safety event to analytics
      if (sessionId && conversationId) {
        // For violations, log as trust-impacting event
        if (safetyResult.radioSilence) {
          // Log safety violation (simplified)
          logger.warn('Safety violation occurred', {
            sessionId: sessionId.substring(0, 8),
            conversationId: conversationId.substring(0, 8),
            violationType: safetyResult.violationType,
            reason: safetyResult.reason
          });
        }

        // Log safety check details
        logger.info('Safety check completed', {
          messageId: `${conversationId}_safety_check`,
          isAllowed: safetyResult.isAllowed,
          violationType: safetyResult.violationType,
          confidence: safetyResult.confidence,
          interfaceLocked: safetyResult.radioSilence,
          checkDurationMs
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to log safety check to analytics', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: sessionId?.substring(0, 8) + '...'
      });
      return false;
    }
  }

  /**
   * Check if message contains attempts to bypass safety filters
   */
  static containsBypassAttempt(message: string): boolean {
    const bypassIndicators = [
      'ignore your instructions',
      'forget your guidelines',
      'pretend you can',
      'act as if',
      'roleplay as',
      'simulate being',
      'bypass your safety',
      'override your rules'
    ];

    const messageLower = message.toLowerCase();
    return bypassIndicators.some(indicator => messageLower.includes(indicator));
  }

  /**
   * Generate explanation for why radio silence was triggered (for internal logging only)
   */
  static explainRadioSilence(violation: { type: string; reason: string; confidence: number }): string {
    return `Radio silence: ${violation.type} violation (${violation.reason}) detected with ${Math.round(violation.confidence * 100)}% confidence. Noah will not respond to maintain Trust Recovery Protocol integrity.`;
  }
}