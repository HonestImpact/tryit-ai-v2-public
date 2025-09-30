/**
 * Tool Knowledge Service
 * Provides intelligent design pattern loading for enhanced agent capabilities
 */

import { createLogger } from '@/lib/logger';
import { toolReferenceService, type ToolReference } from '@/lib/knowledge/tool-reference-service';

const logger = createLogger('tool-knowledge');

export interface DesignPattern {
  title: string;
  category: string;
  description: string;
  features: string[];
  usagePatterns: string[];
  codeSnippets: {
    structure: string;
    styling: string;
    functionality: string;
  };
  relevanceScore: number;
}

export interface KnowledgeContext {
  userIntent: string;
  patterns: DesignPattern[];
  recommendations: string[];
  similarityMap: Map<string, number>;
}

export class ToolKnowledgeService {
  private patternCache = new Map<string, DesignPattern[]>();
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Get relevant design patterns for a user request
   */
  async getRelevantPatterns(userRequest: string, maxPatterns: number = 5): Promise<KnowledgeContext> {
    try {
      logger.info('🧠 Analyzing request for design patterns', { 
        userRequest: userRequest.substring(0, 100),
        maxPatterns 
      });

      const cacheKey = this.normalizeIntent(userRequest);
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        const cachedPatterns = this.patternCache.get(cacheKey)!;
        logger.info('📦 Using cached patterns', { count: cachedPatterns.length });
        return this.buildKnowledgeContext(userRequest, cachedPatterns);
      }

      // Extract key concepts and search for relevant tools
      const searchTerms = this.extractSearchTerms(userRequest);
      const relevantTools: ToolReference[] = [];

      // Search with multiple strategies
      for (const term of searchTerms) {
        try {
          const tools = await toolReferenceService.searchTools(term, { limit: 3 });
          relevantTools.push(...tools);
        } catch (error) {
          logger.warn('Search term failed, continuing', { term, error });
        }
      }

      // Remove duplicates and convert to design patterns
      const uniqueTools = this.deduplicateTools(relevantTools);
      const patterns = uniqueTools
        .slice(0, maxPatterns)
        .map(tool => this.convertToDesignPattern(tool, userRequest));

      // Cache the results
      this.patternCache.set(cacheKey, patterns);
      this.cacheTimestamps.set(cacheKey, Date.now());

      logger.info('✅ Generated design patterns', { 
        toolsFound: uniqueTools.length,
        patternsCreated: patterns.length,
        searchTerms
      });

      return this.buildKnowledgeContext(userRequest, patterns);

    } catch (error) {
      logger.error('💥 Failed to get relevant patterns', { error, userRequest });
      return {
        userIntent: userRequest,
        patterns: [],
        recommendations: ['Consider building from basic HTML, CSS, and JavaScript patterns'],
        similarityMap: new Map()
      };
    }
  }

  /**
   * Get specific tool implementation
   */
  async getToolImplementation(toolName: string): Promise<ToolReference | null> {
    try {
      return await toolReferenceService.getToolByName(toolName);
    } catch (error) {
      logger.error('💥 Failed to get tool implementation', { error, toolName });
      return null;
    }
  }

  /**
   * Extract meaningful search terms from user request
   */
  private extractSearchTerms(userRequest: string): string[] {
    const request = userRequest.toLowerCase();
    const terms: string[] = [];

    // Core functionality terms
    const functionalityMap = {
      'calculator': ['calculator', 'math', 'computation'],
      'timer': ['timer', 'countdown', 'time'],
      'budget': ['budget', 'finance', 'expense', 'money'],
      'tracker': ['tracker', 'progress', 'monitoring'],
      'form': ['form', 'input', 'data collection'],
      'chart': ['chart', 'graph', 'visualization'],
      'kanban': ['kanban', 'task', 'project management'],
      'calendar': ['calendar', 'schedule', 'date'],
      'checklist': ['checklist', 'todo', 'task'],
      'slider': ['slider', 'range', 'control'],
      'rating': ['rating', 'feedback', 'score']
    };

    // Find matching functionalities
    for (const [key, searchTerms] of Object.entries(functionalityMap)) {
      if (searchTerms.some(term => request.includes(term))) {
        terms.push(key);
        terms.push(...searchTerms.filter(term => request.includes(term)));
      }
    }

    // Add context-specific terms
    if (request.includes('interactive')) terms.push('interactive');
    if (request.includes('responsive')) terms.push('responsive');
    if (request.includes('dashboard')) terms.push('dashboard', 'data visualization');
    if (request.includes('admin')) terms.push('admin', 'management');

    // Fallback to general terms if no specific matches
    if (terms.length === 0) {
      if (request.includes('build')) terms.push('interactive');
      if (request.includes('create')) terms.push('form', 'tool');
      terms.push('utility'); // Always include utilities as fallback
    }

    return [...new Set(terms)].slice(0, 5); // Unique terms, max 5
  }

  /**
   * Convert tool reference to design pattern
   */
  private convertToDesignPattern(tool: ToolReference, userRequest: string): DesignPattern {
    const relevanceScore = this.calculateRelevance(tool, userRequest);
    
    // Extract code snippets from HTML content
    const codeSnippets = this.extractCodeSnippets(tool.htmlContent);

    return {
      title: tool.title,
      category: tool.category,
      description: tool.description || `${tool.title} implementation pattern`,
      features: tool.features.split(', ').filter(f => f.length > 0),
      usagePatterns: tool.usagePatterns.split(', ').filter(p => p.length > 0),
      codeSnippets,
      relevanceScore
    };
  }

  /**
   * Extract structured code snippets from HTML
   */
  private extractCodeSnippets(htmlContent: string): DesignPattern['codeSnippets'] {
    // Extract CSS (between <style> tags)
    const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const styling = styleMatch ? styleMatch[1].trim() : '';

    // Extract JavaScript (between <script> tags)
    const scriptMatch = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const functionality = scriptMatch ? scriptMatch[1].trim() : '';

    // Extract HTML structure (remove style and script content)
    let structure = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<html[^>]*>|<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>|<\/body>/gi, '')
      .trim();

    return {
      structure: structure.substring(0, 1000), // Limit size
      styling: styling.substring(0, 1000),
      functionality: functionality.substring(0, 1000)
    };
  }

  /**
   * Calculate relevance score between tool and user request
   */
  private calculateRelevance(tool: ToolReference, userRequest: string): number {
    const request = userRequest.toLowerCase();
    const toolText = `${tool.title} ${tool.description} ${tool.category} ${tool.features} ${tool.usagePatterns}`.toLowerCase();
    
    let score = 0;
    const words = request.split(/\s+/).filter(w => w.length > 2);
    
    words.forEach(word => {
      if (toolText.includes(word)) {
        score += 1;
      }
    });

    // Normalize score (0-1 range)
    return Math.min(score / Math.max(words.length, 1), 1);
  }

  /**
   * Remove duplicate tools based on title and category
   */
  private deduplicateTools(tools: ToolReference[]): ToolReference[] {
    const seen = new Set<string>();
    return tools.filter(tool => {
      const key = `${tool.title}-${tool.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Build comprehensive knowledge context
   */
  private buildKnowledgeContext(userRequest: string, patterns: DesignPattern[]): KnowledgeContext {
    const recommendations: string[] = [];
    const similarityMap = new Map<string, number>();

    patterns.forEach(pattern => {
      similarityMap.set(pattern.title, pattern.relevanceScore);
      
      // Generate contextual recommendations
      if (pattern.relevanceScore > 0.7) {
        recommendations.push(`Consider ${pattern.title} pattern for ${pattern.category.toLowerCase()} functionality`);
      }
    });

    // Add general recommendations
    if (patterns.length > 0) {
      const topCategory = patterns[0].category;
      recommendations.push(`Focus on ${topCategory.toLowerCase()} best practices`);
      recommendations.push('Ensure responsive design and accessibility');
    }

    return {
      userIntent: userRequest,
      patterns,
      recommendations: recommendations.slice(0, 5), // Limit recommendations
      similarityMap
    };
  }

  /**
   * Normalize user intent for caching
   */
  private normalizeIntent(intent: string): string {
    return intent.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    if (!this.patternCache.has(cacheKey)) return false;
    
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.cacheExpiry;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.cacheExpiry) {
        this.patternCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }
}