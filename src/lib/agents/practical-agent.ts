// Practical Agent (Tinkerer) - Technical Implementation Specialist (Simplified for initial deployment)
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

export class PracticalAgent extends BaseAgent {
  private readonly logger = createLogger('tinkerer-agent');
  private readonly sharedResources?: AgentSharedResources;

  constructor(
    llmProvider: LLMProvider,
    config: AgentConfig = {},
    sharedResources?: AgentSharedResources
  ) {
    const capabilities: AgentCapability[] = [
      {
        name: 'technical-implementation',
        description: 'Creates production-ready code with enterprise standards',
        version: '2.0.0'
      }
    ];

    super('tinkerer', 'Tinkerer - Advanced Technical Implementation', capabilities, llmProvider, {
      temperature: 0.3,
      maxTokens: 4000,
      ...config
    });

    this.sharedResources = sharedResources;
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    this.logger.info('Tinkerer processing implementation request', {
      requestId: request.id,
      contentLength: request.content.length
    });

    try {
      // Enhanced implementation with knowledge patterns
      let enhancedContent = request.content;
      let knowledgeContext = '';
      let componentsUsed = ['custom-generation'];

      // Get relevant design patterns if tool knowledge service is available
      if (this.sharedResources?.toolKnowledgeService) {
        this.logger.info('🧠 Enhancing request with design patterns...');
        
        try {
          const knowledgeResult = await this.sharedResources.toolKnowledgeService.getRelevantPatterns(
            request.content, 
            3 // Get top 3 most relevant patterns
          );

          if (knowledgeResult.patterns.length > 0) {
            this.logger.info('✅ Found relevant patterns', {
              patternsCount: knowledgeResult.patterns.length,
              topPattern: knowledgeResult.patterns[0]?.title
            });

            // Build knowledge context for enhanced generation
            knowledgeContext = this.buildKnowledgeContext(knowledgeResult);
            enhancedContent = `${request.content}\n\n${knowledgeContext}`;
            componentsUsed = ['knowledge-enhanced-generation', ...knowledgeResult.patterns.map(p => p.title)];
          }
        } catch (error) {
          this.logger.warn('Knowledge enhancement failed, proceeding without patterns', { error });
        }
      }

      const result = await this.llmProvider.generateText({
        messages: [{ role: 'user', content: enhancedContent }],
        system: this.getEnhancedSystemPrompt(knowledgeContext),
        model: process.env.LLM_DEEPBUILD_ID || process.env.LLM_DEFAULT_ID || 'claude-sonnet-4-20250514',
        temperature: 0.3
      });

      const confidence = knowledgeContext ? 0.95 : 0.9;
      const strategy = knowledgeContext ? 'knowledge-enhanced-build' : 'direct-build';

      return {
        requestId: request.id,
        agentId: this.id,
        content: result.content,
        confidence,
        reasoning: knowledgeContext 
          ? 'Technical implementation enhanced with relevant design patterns'
          : 'Technical implementation completed',
        timestamp: new Date(),
        metadata: {
          implementationStrategy: strategy,
          componentsUsed,
          knowledgeEnhanced: !!knowledgeContext
        }
      };

    } catch (error) {
      this.logger.error('Tinkerer processing failed', { error });
      return this.generateBasicResponse(request, error);
    }
  }

  protected getSystemPrompt(): string {
    return `You are the Tinkerer, an advanced AI agent specialized in enterprise-grade technical implementation.

CORE IDENTITY:
- You excel at building sophisticated, production-ready solutions
- You prioritize code quality, maintainability, and performance
- You create complete, working implementations

YOUR TECHNICAL STANDARDS:
- Modern Web Standards: HTML5, CSS3, ES6+ JavaScript
- Accessibility: WCAG 2.1 AA compliance with proper ARIA labels
- Responsive Design: Mobile-first approach with flexible layouts
- Performance: Optimized DOM manipulation and resource loading
- Security: Input validation and XSS prevention

TOOL CREATION FORMAT:
When building tools, use this exact format:

TITLE: [Clear, descriptive tool name]
TOOL:
[Complete HTML with embedded CSS and JavaScript]

REASONING:
[Brief explanation of design choices]

Create functional, self-contained solutions that work immediately when saved as .html files.`;
  }

  /**
   * Enhanced system prompt with knowledge context
   */
  private getEnhancedSystemPrompt(knowledgeContext: string): string {
    const basePrompt = this.getSystemPrompt();
    
    if (!knowledgeContext) {
      return basePrompt;
    }

    return `${basePrompt}

KNOWLEDGE ENHANCEMENT:
You have access to proven design patterns and implementations that are relevant to this request. Use these patterns as inspiration and foundation, but adapt them to the specific requirements. The patterns provide excellent starting points for structure, styling, and functionality.

${knowledgeContext}

INTEGRATION GUIDANCE:
- Leverage the proven patterns as your foundation
- Adapt and enhance the patterns for the specific use case
- Combine multiple patterns if beneficial
- Ensure the final implementation is cohesive and polished
- Maintain the established technical standards while incorporating pattern insights`;
  }

  /**
   * Build knowledge context from relevant patterns
   */
  private buildKnowledgeContext(knowledgeResult: any): string {
    if (!knowledgeResult.patterns || knowledgeResult.patterns.length === 0) {
      return '';
    }

    let context = 'RELEVANT DESIGN PATTERNS:\n\n';

    knowledgeResult.patterns.forEach((pattern: any, index: number) => {
      context += `${index + 1}. ${pattern.title} (${pattern.category})\n`;
      context += `   Description: ${pattern.description}\n`;
      
      if (pattern.features && pattern.features.length > 0) {
        context += `   Key Features: ${pattern.features.slice(0, 3).join(', ')}\n`;
      }

      if (pattern.codeSnippets) {
        // Include key structural patterns
        if (pattern.codeSnippets.structure) {
          const structurePreview = pattern.codeSnippets.structure
            .replace(/\s+/g, ' ')
            .substring(0, 200);
          context += `   Structure Pattern: ${structurePreview}...\n`;
        }

        // Include key styling approaches
        if (pattern.codeSnippets.styling) {
          const stylePreview = pattern.codeSnippets.styling
            .replace(/\s+/g, ' ')
            .substring(0, 150);
          context += `   Style Pattern: ${stylePreview}...\n`;
        }
      }

      context += `   Relevance: ${Math.round(pattern.relevanceScore * 100)}%\n\n`;
    });

    if (knowledgeResult.recommendations && knowledgeResult.recommendations.length > 0) {
      context += 'RECOMMENDATIONS:\n';
      knowledgeResult.recommendations.forEach((rec: string, index: number) => {
        context += `- ${rec}\n`;
      });
    }

    return context;
  }
}