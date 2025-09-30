// Analytics Database Layer - Secure, Pooled PostgreSQL integration for Noah
// Zero-performance-impact, async-first, error-resilient implementation

import { createLogger } from '@/lib/logger';
import { analyticsPool, type PooledQueryOptions } from './connection-pool';
import type { 
  SessionData, 
  ConversationData, 
  MessageData, 
  GeneratedToolData, 
  ToolUsageEvent,
  PerformanceMetrics,
  TrustEventData,
  MessageAnnotationData
} from './types';

const logger = createLogger('analytics-db');

class AnalyticsDatabase {
  constructor() {
    // Connection management now handled by secure connection pool
  }

  /**
   * Execute database query using secure connection pool
   */
  private async executeQuery<T = any>(
    query: string, 
    params: any[] = [], 
    options: PooledQueryOptions = {}
  ): Promise<T | null> {
    // Delegate to secure connection pool
    return analyticsPool.executeQuery<T>(query, params, options);
  }

  /**
   * Get or create user session with elegant fingerprint handling
   */
  async getOrCreateSession(sessionData: SessionData): Promise<string | null> {
    try {
      // First, try to get existing session
      const existingSession = await this.executeQuery<{ id: string }[]>(
        'SELECT id FROM user_sessions WHERE session_fingerprint = $1',
        [sessionData.sessionFingerprint]
      );

      if (existingSession && existingSession.length > 0) {
        // Update last_seen timestamp
        await this.executeQuery(
          'UPDATE user_sessions SET last_seen = NOW() WHERE id = $1',
          [existingSession[0].id]
        );
        return existingSession[0].id;
      }

      // Create new session
      const newSession = await this.executeQuery<{ id: string }[]>(
        `INSERT INTO user_sessions (session_fingerprint, environment) 
         VALUES ($1, $2) 
         RETURNING id`,
        [sessionData.sessionFingerprint, sessionData.environment]
      );

      return newSession && newSession.length > 0 ? newSession[0].id : null;

    } catch (error) {
      logger.error('Failed to get or create session', { 
        error: error instanceof Error ? error.message : String(error),
        fingerprint: sessionData.sessionFingerprint.substring(0, 10) + '...'
      });
      return null;
    }
  }

  /**
   * Create conversation record with proper sequence calculation
   */
  async createConversation(conversationData: ConversationData): Promise<string | null> {
    try {
      // First, get the correct conversation sequence for this session
      const sequenceResult = await this.executeQuery<{ next_sequence: number }[]>(
        `SELECT COALESCE(MAX(conversation_sequence), 0) + 1 as next_sequence 
         FROM conversations 
         WHERE session_id = $1`,
        [conversationData.sessionId]
      );

      const nextSequence = sequenceResult && sequenceResult.length > 0 
        ? sequenceResult[0].next_sequence 
        : 1;

      const result = await this.executeQuery<{ id: string }[]>(
        `INSERT INTO conversations (
          session_id, conversation_sequence, initial_trust_level, skeptic_mode,
          conversation_length, conversation_duration_ms, user_engagement_level,
          completion_status, agent_strategy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id`,
        [
          conversationData.sessionId,
          nextSequence, // Use calculated sequence instead of hardcoded value
          conversationData.initialTrustLevel || 50,
          conversationData.skepticModeEnabled, // maps to skeptic_mode column
          conversationData.conversationLength,
          conversationData.conversationDurationMs,
          conversationData.userEngagementLevel,
          conversationData.completionStatus,
          conversationData.agentStrategy
        ]
      );

      if (result && result.length > 0) {
        logger.debug('Conversation created with proper sequence', {
          conversationId: result[0].id.substring(0, 8) + '...',
          sessionId: conversationData.sessionId.substring(0, 8) + '...',
          sequence: nextSequence
        });
      }

      return result && result.length > 0 ? result[0].id : null;

    } catch (error) {
      logger.error('Failed to create conversation', { 
        error: error instanceof Error ? error.message : String(error),
        sessionId: conversationData.sessionId
      });
      return null;
    }
  }

  /**
   * Log message with comprehensive metadata AND FULL CONTENT
   */
  async logMessage(messageData: MessageData): Promise<string | null> {
    try {
      const result = await this.executeQuery<{ id: string }[]>(
        `INSERT INTO messages (
          conversation_id, session_id, message_sequence, role, content, content_length,
          word_count, message_type, response_time_ms, agent_involved, trust_delta, 
          reasoning, sentiment, skeptic_mode_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING id`,
        [
          messageData.conversationId,
          messageData.sessionId,
          messageData.messageSequence,
          messageData.role,
          messageData.content, // NOW STORING ACTUAL CONTENT
          messageData.contentLength,
          messageData.wordCount,
          messageData.messageType,
          messageData.responseTimeMs,
          messageData.agentInvolved,
          messageData.trustDelta || 0,
          messageData.reasoning,
          messageData.sentiment,
          messageData.skepticModeActive || false
        ]
      );

      return result && result.length > 0 ? result[0].id : null;

    } catch (error) {
      logger.error('Failed to log message', { 
        error: error instanceof Error ? error.message : String(error),
        conversationId: messageData.conversationId
      });
      return null;
    }
  }

  /**
   * Log generated tool with deduplication support AND FULL CONTENT
   */
  async logGeneratedTool(toolData: GeneratedToolData): Promise<string | null> {
    try {
      const result = await this.executeQuery<{ id: string }[]>(
        `INSERT INTO generated_tools (
          conversation_id, session_id, message_id, content_hash, title, content,
          content_type, content_length, tool_type, tool_category, generation_time_ms,
          generation_agent, user_message_length, version, download_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
        RETURNING id`,
        [
          toolData.conversationId,
          toolData.sessionId,
          toolData.messageId,
          toolData.toolHash,
          toolData.title,
          toolData.content, // NOW STORING ACTUAL CONTENT
          toolData.contentType || 'text/plain',
          toolData.contentLength,
          toolData.toolType,
          toolData.toolCategory,
          toolData.generationTimeMs,
          toolData.generationAgent,
          toolData.userMessageLength,
          toolData.version || 1,
          toolData.downloadCount || 0
        ]
      );

      return result && result.length > 0 ? result[0].id : null;

    } catch (error) {
      logger.error('Failed to log generated tool', { 
        error: error instanceof Error ? error.message : String(error),
        title: toolData.title
      });
      return null;
    }
  }

  /**
   * Log tool usage event for adoption tracking
   */
  async logToolUsageEvent(eventData: ToolUsageEvent): Promise<boolean> {
    try {
      await this.executeQuery(
        `INSERT INTO tool_usage_events (
          tool_id, session_id, event_type, usage_context, interaction_duration_ms
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          eventData.toolId,
          eventData.sessionId,
          eventData.eventType,
          eventData.usageContext,
          eventData.interactionDurationMs
        ]
      );

      return true;

    } catch (error) {
      logger.error('Failed to log tool usage event', { 
        error: error instanceof Error ? error.message : String(error),
        toolId: eventData.toolId,
        eventType: eventData.eventType
      });
      return false;
    }
  }

  /**
   * Update conversation completion status
   */
  async updateConversationStatus(
    conversationId: string, 
    status: 'completed' | 'abandoned' | 'error',
    finalTrustLevel?: number
  ): Promise<boolean> {
    try {
      await this.executeQuery(
        `UPDATE conversations 
         SET completion_status = $1, final_trust_level = $2, updated_at = NOW()
         WHERE id = $3`,
        [status, finalTrustLevel, conversationId]
      );

      return true;

    } catch (error) {
      logger.error('Failed to update conversation status', { 
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        status
      });
      return false;
    }
  }

  /**
   * Health check for analytics database
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeQuery(
        'SELECT 1 as health_check',
        [],
        { timeout: 2000, retries: 1, skipOnError: false }
      );
      return result !== null;
    } catch (error) {
      logger.error('Analytics database health check failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Log trust level change event for Trust Recovery Protocol
   */
  async logTrustEvent(trustEventData: TrustEventData): Promise<string | null> {
    try {
      const result = await this.executeQuery<{ id: string }[]>(
        `INSERT INTO trust_events (
          session_id, conversation_id, previous_level, new_level, 
          trigger_event, trigger_reason
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id`,
        [
          trustEventData.sessionId,
          trustEventData.conversationId,
          trustEventData.previousLevel,
          trustEventData.newLevel,
          trustEventData.triggerEvent,
          trustEventData.triggerReason
        ]
      );

      return result && result.length > 0 ? result[0].id : null;

    } catch (error) {
      logger.error('Failed to log trust event', { 
        error: error instanceof Error ? error.message : String(error),
        sessionId: trustEventData.sessionId
      });
      return null;
    }
  }

  /**
   * Add message annotation for rich metadata tracking
   */
  async addMessageAnnotation(annotationData: MessageAnnotationData): Promise<string | null> {
    try {
      const result = await this.executeQuery<{ id: string }[]>(
        `INSERT INTO message_annotations (
          message_id, annotation_type, annotation_value, confidence_score
        ) VALUES ($1, $2, $3, $4) 
        RETURNING id`,
        [
          annotationData.messageId,
          annotationData.annotationType,
          annotationData.annotationValue,
          annotationData.confidenceScore
        ]
      );

      return result && result.length > 0 ? result[0].id : null;

    } catch (error) {
      logger.error('Failed to add message annotation', { 
        error: error instanceof Error ? error.message : String(error),
        messageId: annotationData.messageId
      });
      return null;
    }
  }

  // ===========================================
  // ANALYTICAL QUERY LAYER FOR TRUST RECOVERY
  // ===========================================

  /**
   * Get complete conversation with messages and trust timeline
   */
  async getConversationHistory(conversationId: string): Promise<any> {
    try {
      const conversation = await this.executeQuery(`
        SELECT 
          c.*,
          s.session_fingerprint,
          COUNT(m.id) as total_messages,
          COUNT(gt.id) as total_artifacts,
          MIN(m.created_at) as first_message_time,
          MAX(m.created_at) as last_message_time
        FROM conversations c
        LEFT JOIN user_sessions s ON c.session_id = s.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        LEFT JOIN generated_tools gt ON c.id = gt.conversation_id
        WHERE c.id = $1
        GROUP BY c.id, s.session_fingerprint
      `, [conversationId]);

      const messages = await this.executeQuery(`
        SELECT 
          m.*,
          array_agg(
            json_build_object(
              'type', ma.annotation_type,
              'value', ma.annotation_value,
              'confidence', ma.confidence_score
            )
          ) FILTER (WHERE ma.id IS NOT NULL) as annotations
        FROM messages m
        LEFT JOIN message_annotations ma ON m.id = ma.message_id
        WHERE m.conversation_id = $1
        GROUP BY m.id
        ORDER BY m.message_sequence ASC
      `, [conversationId]);

      const trustEvents = await this.executeQuery(`
        SELECT * FROM trust_events 
        WHERE conversation_id = $1 
        ORDER BY created_at ASC
      `, [conversationId]);

      const artifacts = await this.executeQuery(`
        SELECT * FROM generated_tools 
        WHERE conversation_id = $1 
        ORDER BY created_at ASC
      `, [conversationId]);

      return {
        conversation: conversation?.[0],
        messages: messages || [],
        trustEvents: trustEvents || [],
        artifacts: artifacts || []
      };

    } catch (error) {
      logger.error('Failed to get conversation history', { 
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      return null;
    }
  }

  /**
   * Get trust evolution across all conversations for a session
   * Fixed: Each trust event now correlates with only the latest message at event time
   */
  async getTrustTimeline(sessionId: string): Promise<any> {
    try {
      const result = await this.executeQuery(`
        SELECT 
          te.*,
          c.conversation_sequence,
          latest_msg.content as trigger_message_content,
          latest_msg.role as trigger_message_role
        FROM trust_events te
        LEFT JOIN conversations c ON te.conversation_id = c.id
        LEFT JOIN LATERAL (
          SELECT m.content, m.role, m.created_at
          FROM messages m
          WHERE m.conversation_id = te.conversation_id 
            AND m.created_at <= te.created_at
          ORDER BY m.created_at DESC
          LIMIT 1
        ) latest_msg ON true
        WHERE te.session_id = $1
        ORDER BY te.created_at ASC
      `, [sessionId]);

      return result || [];

    } catch (error) {
      logger.error('Failed to get trust timeline', { 
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
      return [];
    }
  }

  /**
   * Get rich analytics dashboard data
   */
  async getAnalyticsDashboard(limit: number = 50): Promise<any> {
    try {
      const conversations = await this.executeQuery(`
        SELECT 
          c.*,
          s.session_fingerprint,
          COUNT(DISTINCT m.id) as message_count,
          COUNT(DISTINCT gt.id) as artifact_count,
          AVG(m.response_time_ms) as avg_response_time,
          STRING_AGG(DISTINCT m.agent_involved, ', ') as agents_used,
          MAX(te.new_level) as peak_trust_level,
          MIN(te.new_level) as lowest_trust_level
        FROM conversations c
        LEFT JOIN user_sessions s ON c.session_id = s.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        LEFT JOIN generated_tools gt ON c.id = gt.conversation_id
        LEFT JOIN trust_events te ON c.id = te.conversation_id
        GROUP BY c.id, s.session_fingerprint
        ORDER BY c.created_at DESC
        LIMIT $1
      `, [limit]);

      return conversations || [];

    } catch (error) {
      logger.error('Failed to get analytics dashboard', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Search conversations by content 
   */
  async searchConversations(searchTerm: string, limit: number = 20): Promise<any> {
    try {
      const result = await this.executeQuery(`
        SELECT DISTINCT
          c.*,
          s.session_fingerprint,
          COUNT(m.id) as message_count,
          ts_headline('english', m.content, plainto_tsquery('english', $1)) as content_snippet
        FROM conversations c
        LEFT JOIN user_sessions s ON c.session_id = s.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
        GROUP BY c.id, s.session_fingerprint, m.content
        ORDER BY c.created_at DESC
        LIMIT $2
      `, [searchTerm, limit]);

      return result || [];

    } catch (error) {
      logger.error('Failed to search conversations', { 
        error: error instanceof Error ? error.message : String(error),
        searchTerm
      });
      return [];
    }
  }
}

// Export singleton instance for consistent database access
export const analyticsDb = new AnalyticsDatabase();