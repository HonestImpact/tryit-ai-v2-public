// Unified Session Management - Coordinates session tracking across all services
// Ensures consistent session identification between middleware, analytics, and agents

import { createLogger } from '@/lib/logger';
import { generateSessionFingerprint } from '@/lib/analytics/session';
import type { NextRequest } from 'next/server';

const logger = createLogger('unified-session');

export interface UnifiedSessionData {
  sessionId: string;
  sessionFingerprint: string;
  environment: 'development' | 'preview' | 'production';
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionExtractionResult {
  sessionData: UnifiedSessionData;
  isNewSession: boolean;
}

export class UnifiedSessionManager {
  private static readonly SESSION_HEADER = 'x-noah-session-id';
  private static readonly FINGERPRINT_HEADER = 'x-noah-session-fingerprint';

  /**
   * Extract or create unified session from request
   */
  static extractSessionFromRequest(request: NextRequest): SessionExtractionResult {
    try {
      // Extract request data
      const userAgent = request.headers.get('user-agent') || undefined;
      const ipAddress = this.extractIpAddress(request);
      const environment = this.determineEnvironment();

      // Check for existing session in headers (from previous middleware)
      const existingSessionId = request.headers.get(this.SESSION_HEADER);
      const existingFingerprint = request.headers.get(this.FINGERPRINT_HEADER);

      if (existingSessionId && existingFingerprint) {
        logger.debug('Using existing session from headers', {
          sessionId: existingSessionId.substring(0, 8) + '...',
          fingerprint: existingFingerprint.substring(0, 16) + '...'
        });

        return {
          sessionData: {
            sessionId: existingSessionId,
            sessionFingerprint: existingFingerprint,
            environment,
            userAgent,
            ipAddress,
            createdAt: new Date(), // This will be the request time, not session creation
            metadata: { source: 'existing-headers' }
          },
          isNewSession: false
        };
      }

      // Generate new session data
      const sessionFingerprint = generateSessionFingerprint(userAgent, ipAddress, environment);
      const sessionId = this.generateSessionId(sessionFingerprint);

      const sessionData: UnifiedSessionData = {
        sessionId,
        sessionFingerprint,
        environment,
        userAgent,
        ipAddress,
        createdAt: new Date(),
        metadata: { source: 'unified-manager-creation' }
      };

      logger.info('Created new unified session', {
        sessionId: sessionId.substring(0, 8) + '...',
        fingerprint: sessionFingerprint.substring(0, 16) + '...',
        environment,
        hasUserAgent: !!userAgent,
        hasIpAddress: !!ipAddress
      });

      return {
        sessionData,
        isNewSession: true
      };

    } catch (error) {
      logger.error('Failed to extract session from request', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback session
      const fallbackFingerprint = generateSessionFingerprint(undefined, undefined, 'development');
      const fallbackSessionId = this.generateSessionId(fallbackFingerprint);

      return {
        sessionData: {
          sessionId: fallbackSessionId,
          sessionFingerprint: fallbackFingerprint,
          environment: 'development',
          createdAt: new Date(),
          metadata: { source: 'fallback-creation', error: true }
        },
        isNewSession: true
      };
    }
  }

  /**
   * Create session headers for middleware/analytics coordination
   */
  static createSessionHeaders(sessionData: UnifiedSessionData): Record<string, string> {
    return {
      [this.SESSION_HEADER]: sessionData.sessionId,
      [this.FINGERPRINT_HEADER]: sessionData.sessionFingerprint,
      'x-noah-environment': sessionData.environment,
      'x-noah-session-created': sessionData.createdAt.toISOString()
    };
  }

  /**
   * Extract session data from headers (for use in API routes)
   */
  static getSessionFromHeaders(headers: Headers): UnifiedSessionData | null {
    try {
      const sessionId = headers.get(this.SESSION_HEADER);
      const sessionFingerprint = headers.get(this.FINGERPRINT_HEADER);
      const environment = headers.get('x-noah-environment') as 'development' | 'preview' | 'production';
      const createdAt = headers.get('x-noah-session-created');

      if (!sessionId || !sessionFingerprint) {
        return null;
      }

      return {
        sessionId,
        sessionFingerprint,
        environment: environment || 'development',
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        metadata: { source: 'headers-extraction' }
      };

    } catch (error) {
      logger.warn('Failed to extract session from headers', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Validate session data consistency
   */
  static validateSession(sessionData: UnifiedSessionData): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!sessionData.sessionId || sessionData.sessionId.length < 10) {
      issues.push('Session ID is invalid or too short');
    }

    if (!sessionData.sessionFingerprint || !sessionData.sessionFingerprint.startsWith('session_')) {
      issues.push('Session fingerprint is invalid or malformed');
    }

    if (!['development', 'preview', 'production'].includes(sessionData.environment)) {
      issues.push('Environment is not valid');
    }

    if (!sessionData.createdAt || isNaN(sessionData.createdAt.getTime())) {
      issues.push('Created timestamp is invalid');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate unique session ID from fingerprint
   */
  private static generateSessionId(fingerprint: string): string {
    // Create a unique session ID that includes fingerprint hash + timestamp
    const timestamp = Date.now().toString(36);
    const fingerprintHash = fingerprint.substring(8, 16); // Take part of fingerprint
    return `noah_${fingerprintHash}_${timestamp}`;
  }

  /**
   * Extract IP address with privacy considerations
   */
  private static extractIpAddress(request: NextRequest): string | undefined {
    // Check various headers for IP address (in order of preference)
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];

    for (const header of ipHeaders) {
      const value = request.headers.get(header);
      if (value) {
        // Take first IP if comma-separated list
        const ip = value.split(',')[0].trim();
        if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
          return ip;
        }
      }
    }

    return undefined;
  }

  /**
   * Determine environment from Next.js environment
   */
  private static determineEnvironment(): 'development' | 'preview' | 'production' {
    const nodeEnv = process.env.NODE_ENV;
    const vercelEnv = process.env.VERCEL_ENV;

    if (vercelEnv === 'production') return 'production';
    if (vercelEnv === 'preview') return 'preview';
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'development') return 'development';

    return 'development';
  }

  /**
   * Create session context for analytics and logging
   */
  static createSessionContext(sessionData: UnifiedSessionData) {
    return {
      sessionId: sessionData.sessionId,
      sessionFingerprint: sessionData.sessionFingerprint,
      environment: sessionData.environment,
      createdAt: sessionData.createdAt,
      // Truncated values for logging privacy
      logContext: {
        sessionId: sessionData.sessionId.substring(0, 8) + '...',
        fingerprint: sessionData.sessionFingerprint.substring(0, 16) + '...',
        environment: sessionData.environment,
        hasUserAgent: !!sessionData.userAgent,
        hasIpAddress: !!sessionData.ipAddress
      }
    };
  }
}