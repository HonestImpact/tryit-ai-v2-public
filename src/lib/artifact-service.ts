// Artifact Service - Structured tool generation and storage with elegant analytics integration
// Replaces brittle regex parsing with deterministic structured response handling

import { analyticsService } from '@/lib/analytics';
import { createLogger } from '@/lib/logger';
import { StructuredResponseParser, type ParseResult } from '@/lib/structured-response/parser';
import type { StructuredResponse } from '@/lib/structured-response/types';

const logger = createLogger('artifact-service');

interface ConversationState {
  sessionId: string | null;
  conversationId: string | null;
  messageSequence: number;
  startTime: number;
}

export interface ArtifactResult {
  hasArtifact: boolean;
  title?: string;
  content?: string;
  type?: string;
  category?: string;
  description?: string;
  complexity?: string;
  agentStrategy?: string;
  structuredResponse?: StructuredResponse;
}

export class ArtifactService {
  /**
   * Handle artifact workflow with structured parsing
   */
  static async handleArtifactWorkflow(
    content: string,
    userMessage: string,
    sessionId: string,
    conversationState?: ConversationState,
    agentUsed: 'noah' | 'wanderer' | 'tinkerer' = 'noah',
    agentStrategy?: string
  ): Promise<ArtifactResult> {
    const startTime = Date.now();
    
    
    try {
      // Parse response using structured parser
      const parseResult: ParseResult = StructuredResponseParser.parse(content, agentUsed);
      
      if (!parseResult.success) {
        logger.warn('Failed to parse response, falling back to no artifact', {
          error: parseResult.error,
          contentLength: content.length,
          agentUsed
        });
        
        return { 
          hasArtifact: false,
          structuredResponse: parseResult.response 
        };
      }

      const structuredResponse = parseResult.response!;

      // Check if response contains an artifact
      if (!structuredResponse.artifact) {
        logger.debug('Response parsed successfully but contains no artifact', {
          responseType: structuredResponse.responseType,
          agentUsed
        });
        
        return { 
          hasArtifact: false,
          structuredResponse 
        };
      }

      // Process artifact
      const artifact = structuredResponse.artifact;
      const generationTime = Date.now() - startTime;

      logger.info('Structured artifact generated successfully', {
        title: artifact.title,
        type: artifact.type,
        category: artifact.category,
        complexity: artifact.complexity,
        contentLength: artifact.content.length,
        generationTime,
        agentUsed,
        agentStrategy: agentStrategy || 'noah_direct'
      });

      // Log tool generation with analytics integration (fire-and-forget)
      if (conversationState?.conversationId && conversationState?.sessionId) {
        analyticsService.logGeneratedTool(
          conversationState.conversationId,
          conversationState.sessionId,
          undefined, // messageId will be handled in the chat route
          artifact.title,
          artifact.content,
          generationTime,
          agentUsed,
          userMessage.length,
          agentStrategy
        );

        logger.debug('Structured tool logged to analytics', {
          title: artifact.title,
          type: artifact.type,
          toolLength: artifact.content.length,
          generationTime,
          userMessageLength: userMessage.length,
          agentUsed,
          agentStrategy: agentStrategy || 'noah_direct'
        });
      }
      
      return {
        hasArtifact: true,
        title: artifact.title,
        content: artifact.content,
        type: artifact.type,
        category: artifact.category,
        description: artifact.description,
        complexity: artifact.complexity,
        agentStrategy: agentStrategy || 'noah_direct',
        structuredResponse
      };

    } catch (error) {
      logger.error('Artifact workflow failed with error', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content.length,
        agentUsed
      });

      return { 
        hasArtifact: false,
        structuredResponse: {
          content,
          responseType: 'conversation',
          confidence: 0.3,
          agentUsed,
          reasoning: `Artifact processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Validate artifact content for security and quality
   */
  static validateArtifact(content: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Basic security checks
    if (content.includes('<script>') || content.includes('javascript:')) {
      issues.push('Contains potentially unsafe script content');
    }

    if (content.includes('eval(') || content.includes('Function(')) {
      issues.push('Contains potentially unsafe code execution patterns');
    }

    // Quality checks
    if (content.length < 50) {
      issues.push('Content is too short to be a meaningful tool');
    }

    if (content.length > 50000) {
      issues.push('Content is unusually large and may cause performance issues');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

}