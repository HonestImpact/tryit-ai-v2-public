// Structured Response Parser - Replaces brittle regex with deterministic parsing
// Implements "Best, Cleanest, Fastest, Most Logical, Most Elegant" parsing approach

import { createLogger } from '@/lib/logger';
import type { StructuredResponse, StructuredArtifact } from './types';
import { isValidStructuredResponse, isValidArtifact } from './types';

const logger = createLogger('structured-parser');

export interface ParseResult {
  success: boolean;
  response?: StructuredResponse;
  fallbackContent?: string;
  error?: string;
}

export class StructuredResponseParser {
  /**
   * Parse LLM response with multiple strategies for maximum reliability
   */
  static parse(content: string, agentUsed: 'noah' | 'wanderer' | 'tinkerer' = 'noah'): ParseResult {
    try {
      // Strategy 1: Try to parse as structured JSON response
      const jsonResult = this.parseStructuredJSON(content, agentUsed);
      if (jsonResult.success) {
        logger.debug('Successfully parsed structured JSON response', {
          agentUsed,
          hasArtifact: !!jsonResult.response?.artifact
        });
        return jsonResult;
      }

      // Strategy 2: Try to extract JSON from mixed content
      const extractedResult = this.extractStructuredFromMixed(content, agentUsed);
      if (extractedResult.success) {
        logger.debug('Successfully extracted structured response from mixed content', {
          agentUsed,
          hasArtifact: !!extractedResult.response?.artifact
        });
        return extractedResult;
      }

      // Strategy 3: HTML tool detection (catch Noah's HTML tools even without perfect format)
      const htmlToolResult = this.detectHTMLTool(content, agentUsed);
      if (htmlToolResult.success) {
        logger.debug('Successfully detected HTML tool in conversational format', {
          agentUsed,
          hasArtifact: !!htmlToolResult.response?.artifact
        });
        return htmlToolResult;
      }

      // Strategy 4: Research result detection (for Wanderer agent)
      const researchResult = this.detectResearchResult(content, agentUsed);
      if (researchResult.success) {
        logger.debug('Successfully detected research result from Wanderer', {
          agentUsed,
          hasArtifact: !!researchResult.response?.artifact
        });
        return researchResult;
      }

      // Strategy 5: Legacy TITLE:/TOOL: format (for backward compatibility during transition)
      const legacyResult = this.parseLegacyFormat(content, agentUsed);
      if (legacyResult.success) {
        logger.debug('Successfully parsed legacy TITLE:/TOOL: format', {
          agentUsed,
          hasArtifact: !!legacyResult.response?.artifact
        });
        return legacyResult;
      }

      // Strategy 6: Fallback to conversation response
      logger.info('Parsing as conversation response (no artifacts detected)', { agentUsed });
      return {
        success: true,
        response: {
          content,
          responseType: 'conversation',
          confidence: 0.8,
          agentUsed
        }
      };

    } catch (error) {
      logger.error('Failed to parse response with all strategies', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content.length,
        agentUsed
      });

      return {
        success: false,
        fallbackContent: content,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  /**
   * Parse pure structured JSON response
   */
  private static parseStructuredJSON(content: string, agentUsed: string): ParseResult {
    try {
      // Check if content starts with JSON structure
      const trimmed = content.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return { success: false };
      }

      const parsed = JSON.parse(trimmed);
      
      if (isValidStructuredResponse(parsed)) {
        // Validate artifact if present
        if (parsed.artifact && !isValidArtifact(parsed.artifact)) {
          logger.warn('Invalid artifact in structured response, removing artifact', {
            agentUsed,
            artifactTitle: parsed.artifact && typeof parsed.artifact === 'object' && 'title' in parsed.artifact ? (parsed.artifact as any).title : 'unknown'
          });
          delete parsed.artifact;
        }

        return { success: true, response: parsed };
      }

      return { success: false };

    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Extract structured JSON from mixed content (e.g., explanation + JSON)
   */
  private static extractStructuredFromMixed(content: string, agentUsed: string): ParseResult {
    try {
      // Look for JSON blocks in the content
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return this.parseStructuredJSON(jsonMatch[1], agentUsed);
      }

      // Look for raw JSON blocks (without code fences)
      const rawJsonMatch = content.match(/(\{[\s\S]*"content"[\s\S]*?\})/);
      if (rawJsonMatch) {
        return this.parseStructuredJSON(rawJsonMatch[1], agentUsed);
      }

      return { success: false };

    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Detect HTML tools in conversational format (Noah's tool creation)
   */
  private static detectHTMLTool(content: string, agentUsed: string): ParseResult {
    try {
      // Check if content looks like a tool creation response
      const toolKeywords = ['calculator', 'timer', 'converter', 'form', 'tracker', 'tool', 'widget', 'app'];
      const hasToolKeyword = toolKeywords.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      // Check for HTML patterns
      const hasHTML = /<!DOCTYPE html|<html|<head|<body|<div|<input|<button/i.test(content);
      const hasCSS = /<style|\.[\w-]+\s*\{|style\s*=/i.test(content);
      const hasJS = /<script|function\s+\w+|onclick|addEventListener/i.test(content);

      // Must have HTML and be substantial (>1000 chars for tools)
      if (!hasHTML || content.length < 1000) {
        return { success: false };
      }

      // Extract HTML content (look for the largest HTML block)
      let htmlContent = content;
      
      // Try to extract from code blocks first
      const codeBlockMatch = content.match(/```html\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        htmlContent = codeBlockMatch[1].trim();
      } else {
        // Look for HTML starting with DOCTYPE or <html>
        const htmlMatch = content.match(/(<!DOCTYPE html[\s\S]*?<\/html>)/i);
        if (htmlMatch) {
          htmlContent = htmlMatch[1].trim();
        } else {
          // Look for substantial HTML blocks
          const bodyMatch = content.match(/(<html[\s\S]*?<\/html>|<body[\s\S]*?<\/body>|<div[\s\S]*?<\/div>)/i);
          if (bodyMatch && bodyMatch[1].length > 500) {
            htmlContent = bodyMatch[1].trim();
          }
        }
      }

      // Generate a tool title based on content analysis
      let title = 'Interactive Tool';
      if (content.toLowerCase().includes('calculator')) title = 'Calculator';
      else if (content.toLowerCase().includes('timer')) title = 'Timer';
      else if (content.toLowerCase().includes('converter')) title = 'Converter';
      else if (content.toLowerCase().includes('form')) title = 'Form';
      else if (content.toLowerCase().includes('tracker')) title = 'Tracker';
      else if (content.toLowerCase().includes('counter')) title = 'Counter';
      else if (content.toLowerCase().includes('generator')) title = 'Generator';

      // Create artifact from detected HTML tool
      const artifact: StructuredArtifact = {
        title,
        content: htmlContent,
        type: this.inferToolType(title, htmlContent),
        category: this.inferToolCategory(title, htmlContent),
        description: `Generated ${title.toLowerCase()}`,
        complexity: this.inferComplexity(htmlContent)
      };

      const response: StructuredResponse = {
        content: content, // Keep full conversational content
        artifact,
        responseType: 'tool-generation',
        confidence: hasToolKeyword ? 0.8 : 0.6, // Lower confidence for auto-detection
        agentUsed: agentUsed as 'noah' | 'wanderer' | 'tinkerer'
      };

      return { success: true, response };

    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Detect research results from Wanderer agent
   */
  private static detectResearchResult(content: string, agentUsed: string): ParseResult {
    try {
      // Only apply to Wanderer agent or long research-like content
      if (agentUsed !== 'wanderer' && content.length < 500) {
        return { success: false };
      }

      // Research indicators
      const researchIndicators = [
        'research', 'analysis', 'trends', 'study', 'investigation',
        'findings', 'sources', 'data', 'statistics', 'report'
      ];

      const contentLower = content.toLowerCase();
      const hasResearchIndicators = researchIndicators.some(indicator => 
        contentLower.includes(indicator)
      );

      // Must have research indicators and be substantial content
      if (!hasResearchIndicators || content.length < 300) {
        return { success: false };
      }

      // Generate research title based on content
      let title = 'Research Report';
      if (contentLower.includes('renewable energy')) title = 'Renewable Energy Research';
      else if (contentLower.includes('e-commerce')) title = 'E-commerce Analysis';
      else if (contentLower.includes('market analysis')) title = 'Market Analysis Report';
      else if (contentLower.includes('trends')) title = 'Trends Analysis';
      else if (contentLower.includes('industry')) title = 'Industry Research';

      // Create research artifact
      const artifact: StructuredArtifact = {
        title,
        content,
        type: 'other',
        category: 'data-processing',
        description: `Research report generated by Wanderer`,
        complexity: content.length > 2000 ? 'complex' : 'moderate'
      };

      const response: StructuredResponse = {
        content,
        artifact,
        responseType: 'research',
        confidence: 0.85,
        agentUsed: agentUsed as 'noah' | 'wanderer' | 'tinkerer'
      };

      return { success: true, response };

    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Parse legacy TITLE:/TOOL: format for backward compatibility
   */
  private static parseLegacyFormat(content: string, agentUsed: string): ParseResult {
    try {
      const hasTitle = content.includes('TITLE:');
      const hasTool = content.includes('TOOL:');
      
      if (!hasTitle || !hasTool) {
        return { success: false };
      }

      const titleMatch = content.match(/TITLE:\s*(.+)/);
      const toolMatch = content.match(/TOOL:\s*([\s\S]+?)(?:\n\nREASONING:|$)/);
      
      if (!titleMatch || !toolMatch) {
        return { success: false };
      }

      const title = titleMatch[1].trim();
      let toolContent = toolMatch[1].trim();
      
      // Handle markdown code blocks (```html ... ```) 
      const codeBlockMatch = toolContent.match(/^```(?:html|javascript|css|js)?\s*([\s\S]*?)\s*```$/);
      if (codeBlockMatch) {
        toolContent = codeBlockMatch[1].trim();
      }

      // Extract reasoning if present
      const reasoningMatch = content.match(/REASONING:\s*([\s\S]+?)$/);
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : undefined;

      // Create structured response from legacy format
      const artifact: StructuredArtifact = {
        title,
        content: toolContent,
        type: this.inferToolType(title, toolContent),
        category: this.inferToolCategory(title, toolContent),
        description: `Generated tool: ${title}`,
        complexity: this.inferComplexity(toolContent)
      };

      const response: StructuredResponse = {
        content: content, // Keep full content for display
        artifact,
        responseType: 'tool-generation',
        confidence: 0.7, // Lower confidence for legacy parsing
        reasoning,
        agentUsed: agentUsed as 'noah' | 'wanderer' | 'tinkerer'
      };

      return { success: true, response };

    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Infer tool type from title and content
   */
  private static inferToolType(title: string, content: string): StructuredArtifact['type'] {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    if (titleLower.includes('calculator') || contentLower.includes('calculate')) return 'calculator';
    if (titleLower.includes('dashboard') || contentLower.includes('dashboard')) return 'dashboard';
    if (titleLower.includes('component') || contentLower.includes('component')) return 'component';
    if (titleLower.includes('app') || contentLower.includes('application')) return 'app';
    if (titleLower.includes('utility') || contentLower.includes('utility')) return 'utility';
    if (titleLower.includes('tool')) return 'tool';
    
    return 'other';
  }

  /**
   * Infer tool category from title and content
   */
  private static inferToolCategory(title: string, content: string): StructuredArtifact['category'] {
    const combined = (title + ' ' + content).toLowerCase();

    if (combined.includes('interactive') || combined.includes('click') || combined.includes('button')) return 'interactive';
    if (combined.includes('chart') || combined.includes('graph') || combined.includes('visualization')) return 'visualization';
    if (combined.includes('game') || combined.includes('play')) return 'game';
    if (combined.includes('productivity') || combined.includes('organize')) return 'productivity';
    if (combined.includes('data') || combined.includes('process')) return 'data-processing';
    
    return 'display';
  }

  /**
   * Infer complexity from content length and patterns
   */
  private static inferComplexity(content: string): StructuredArtifact['complexity'] {
    const length = content.length;
    const hasAdvancedPatterns = /class|interface|async|await|fetch|api/i.test(content);
    const hasComplexLogic = /for\s*\(|while\s*\(|switch\s*\(|try\s*\{|catch\s*\(/i.test(content);

    if (length > 3000 || hasAdvancedPatterns) return 'advanced';
    if (length > 1500 || hasComplexLogic) return 'complex';
    if (length > 500) return 'moderate';
    
    return 'simple';
  }
}