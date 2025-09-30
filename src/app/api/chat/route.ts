import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { AI_CONFIG } from '@/lib/ai-config';
import { createLogger } from '@/lib/logger';
import { ArtifactService } from '@/lib/artifact-service';
import { withLogging, LoggingContext } from '@/lib/logging-middleware';
import { createLLMProvider } from '@/lib/providers/provider-factory';
import { WandererAgent } from '@/lib/agents/wanderer-agent';
import { PracticalAgent } from '@/lib/agents/practical-agent';
import { sharedResourceManager, type AgentSharedResources } from '@/lib/agents/shared-resources';
import type { ChatMessage } from '@/lib/agents/types';
import { analyticsService } from '@/lib/analytics';
import { analyticsPool } from '@/lib/analytics/connection-pool';
import { NoahSafetyService } from '@/lib/safety';

const logger = createLogger('noah-chat');

/**
 * Concise prompt for Noah's direct tool generation - optimized for speed and efficiency
 */
function getToolGenerationPrompt(): string {
  return `You are Noah, creating functional web tools efficiently.

Create tools using this exact format:
TITLE: [Tool name]
TOOL:
[Complete HTML with embedded CSS and JavaScript]

Requirements:
- Modern, responsive design
- Complete functionality in a single HTML file
- Clean, minimal code without excessive comments
- Focus on core features requested

Keep tools concise but fully functional.`;
}

// 🚀 MODULE-LEVEL AGENT CACHING - Initialize ONCE, reuse forever
let wandererInstance: WandererAgent | null = null;
let tinkererInstance: PracticalAgent | null = null;
let sharedResourcesCache: AgentSharedResources | null = null;
let agentInitializationPromise: Promise<void> | null = null;

// Optimized timeout configuration for production
const NOAH_TIMEOUT = 45000; // 45 seconds for Noah direct responses
const WANDERER_TIMEOUT = 30000; // 30 seconds for fast research (Haiku)
const TINKERER_TIMEOUT = 60000; // 60 seconds for deep building (Sonnet 4)

// Session-based artifact storage (simple in-memory for MVP)
const sessionArtifacts = new Map<string, Array<{
  title: string;
  content: string;
  timestamp: number;
  agent: string;
  id: string;
}>>();

interface ChatResponse {
  content: string;
  status?: string;
  agent?: string;
  agentStrategy?: string;
  artifact?: {
    title: string;
    content: string;
  };
  // Session-scoped artifacts for accumulated toolbox
  sessionArtifacts?: Array<{
    title: string;
    content: string;
    timestamp: number;
    agent: string;
    id: string;
  }>;
}

interface ConversationState {
  sessionId: string | null;
  conversationId: string | null;
  messageSequence: number;
  startTime: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  agent: string;
  capabilities: string[];
  model: string;
  avg_response_time: string;
}

/**
 * Timeout wrapper for async operations
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Noah's simple decision process - like a human brain would think
 * 1. Can I do this quickly and easily? → Do it!
 * 2. Too complex for me? → Delegate appropriately  
 */
function analyzeRequest(content: string): {
  needsResearch: boolean;
  needsBuilding: boolean;
  confidence: number;
  reasoning: string;
} {
  const contentLower = content.toLowerCase();

  // Things Noah can do quickly and easily
  const quickAndEasy = [
    // Simple conversation
    'how to', 'explain', 'help me understand', 'what is', 'tell me about',
    
    // Quick tools Noah loves making
    'calculator', 'timer', 'converter', 'counter', 'stopwatch', 'clock',
    'password generator', 'random generator', 'color picker', 'notepad',
    
    // Text-based stuff Noah's great at
    'list', 'checklist', 'outline', 'template', 'email', 'letter',
    'summary', 'plan', 'advice', 'tips', 'steps', 'instructions'
  ];

  // Only delegate for genuinely tough stuff
  const needsWanderer = [
    'research the latest', 'research current', 'market analysis', 
    'industry trends', 'comprehensive study', 'latest trends in'
  ];

  const needsTinkerer = [
    'react component', 'vue component', 'angular component',
    'interactive dashboard', 'data visualization', 'full application',
    'database integration', 'api integration', 'complex interface'
  ];

  // Can Noah handle this quickly and easily?
  const canNoahDoThis = quickAndEasy.some(keyword => contentLower.includes(keyword));
  
  // Only delegate if it's genuinely complex
  const needsResearch = needsWanderer.some(keyword => contentLower.includes(keyword));
  const needsBuilding = needsTinkerer.some(keyword => contentLower.includes(keyword));

  let reasoning = '';
  if (needsResearch && needsBuilding) {
    reasoning = 'Too complex - needs research then building';
  } else if (needsBuilding) {
    reasoning = 'Too complex - needs specialized building';
  } else if (needsResearch) {
    reasoning = 'Too complex - needs deep research';  
  } else if (canNoahDoThis) {
    reasoning = 'Quick and easy - Noah can handle this!';
  } else {
    reasoning = 'Simple conversation - Noah handles directly';
  }

  return { 
    needsResearch, 
    needsBuilding, 
    confidence: 0.9, 
    reasoning 
  };
}

/**
 * 🚀 SMART AGENT INITIALIZATION - Initialize once, reuse forever
 */
async function ensureAgentsInitialized(): Promise<void> {
  if (wandererInstance && tinkererInstance && sharedResourcesCache) {
    return;
  }

  if (agentInitializationPromise) {
    return agentInitializationPromise;
  }

  agentInitializationPromise = (async () => {
    try {
      logger.info('🚀 Initializing agents (one-time setup)...');
      const llmProvider = createLLMProvider();

      // Initialize shared resources
      if (!sharedResourcesCache) {
        sharedResourcesCache = await sharedResourceManager.initializeResources(llmProvider);
        logger.info('✅ Shared resources cached');
      }

      // Initialize Wanderer with research-optimized provider
      if (!wandererInstance) {
        const researchProvider = createLLMProvider('research');
        wandererInstance = new WandererAgent(researchProvider, { temperature: 0.75, maxTokens: 2500 }, sharedResourcesCache);
        logger.info('✅ Wanderer agent cached with research provider');
      }

      // Initialize Tinkerer with deep-build optimized provider
      if (!tinkererInstance) {
        const deepbuildProvider = createLLMProvider('deepbuild');
        tinkererInstance = new PracticalAgent(deepbuildProvider, { temperature: 0.3, maxTokens: 4000 }, sharedResourcesCache);
        logger.info('✅ Tinkerer agent cached with deepbuild provider');
      }

      logger.info('🎉 All agents initialized and cached');
    } catch (error) {
      logger.error('💥 Agent initialization failed', { error });
      wandererInstance = null;
      tinkererInstance = null;
      sharedResourcesCache = null;
      agentInitializationPromise = null;
      throw error;
    }
  })();

  return agentInitializationPromise;
}

/**
 * 🔬 Wanderer research using cached instance
 */
async function wandererResearch(messages: ChatMessage[], context: LoggingContext): Promise<{ content: string }> {
  await ensureAgentsInitialized();

  if (!wandererInstance) {
    throw new Error('Wanderer agent not initialized');
  }

  logger.info('🔬 Using cached Wanderer for research...');
  const wandererLastMessage = messages[messages.length - 1]?.content || '';

  const research = await wandererInstance.processRequest({
    id: `research_${Date.now()}`,
    sessionId: context.sessionId,
    content: wandererLastMessage,
    timestamp: new Date()
  });

  return { content: research.content };
}

/**
 * 🔧 Tinkerer build using cached instance
 */
async function tinkererBuild(messages: ChatMessage[], research: { content: string } | null, context: LoggingContext): Promise<{ content: string }> {
  await ensureAgentsInitialized();

  if (!tinkererInstance) {
    throw new Error('Tinkerer agent not initialized');
  }

  logger.info('🔧 Using cached Tinkerer for building...');
  const tinkererLastMessage = messages[messages.length - 1]?.content || '';
  const buildContent = research
    ? `${tinkererLastMessage}\n\nResearch Context:\n${research.content}`
    : tinkererLastMessage;

  const tool = await tinkererInstance.processRequest({
    id: `build_${Date.now()}`,
    sessionId: context.sessionId,
    content: buildContent,
    timestamp: new Date()
  });

  return { content: tool.content };
}

/**
 * Initialize conversation state with elegant analytics integration
 */
async function initializeConversationState(req: NextRequest, context: LoggingContext, skepticMode: boolean): Promise<ConversationState> {
  const startTime = Date.now();
  
  // Extract session information for analytics (privacy-first)
  const userAgent = req.headers.get('user-agent') || undefined;
  const forwardedFor = req.headers.get('x-forwarded-for') || undefined;
  
  // Fire-and-forget session management - zero performance impact
  const sessionPromise = analyticsService.ensureSession(userAgent, forwardedFor);
  const sessionId = await sessionPromise;
  
  // Fire-and-forget conversation creation if session exists
  let conversationId: string | null = null;
  if (sessionId) {
    const conversationPromise = analyticsService.startConversation(sessionId, skepticMode);
    conversationId = await conversationPromise;
  }
  
  return {
    sessionId,
    conversationId,
    messageSequence: 0,
    startTime
  };
}

/**
 * Clean Noah-only chat handler - handles simple tools and general conversation
 */
async function noahChatHandler(req: NextRequest, context: LoggingContext): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  logger.info('🦉 Noah processing request');

  try {
    // Parse request with timeout protection
    const parsePromise = req.json();
    const { messages, skepticMode } = await withTimeout(parsePromise, 2000);
    
    // Store parsed body in context for logging middleware
    context.requestBody = { messages, skepticMode };

    // Initialize conversation state with analytics (async, zero performance impact)
    const conversationState = await initializeConversationState(req, context, skepticMode || false);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        content: "I didn't receive any messages to respond to. Want to try sending me something?",
        status: 'error',
        agent: 'noah'
      });
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    logger.info('📝 Processing Noah request', {
      messageCount: messages.length,
      messageLength: lastMessage.length,
      analytics: conversationState.sessionId ? 'enabled' : 'disabled'
    });

    // 🛡️ SAFETY CHECK - Radio silence for prohibited content
    const safetyCheck = await NoahSafetyService.checkUserMessage(
      lastMessage,
      conversationState.sessionId || undefined,
      conversationState.conversationId || undefined,
      messages.slice(0, -1).map(m => m.content)
    );

    if (safetyCheck.interfaceLocked) {
      logger.warn('🔒 Interface lockdown activated - safety violation detected', {
        violationType: safetyCheck.violation?.type,
        reason: safetyCheck.violation?.reason,
        sessionId: conversationState.sessionId?.substring(0, 8) + '...'
      });

      // Noah locks the interface - spaces response with all interactions disabled
      // Log the attempted violation for Trust Recovery Protocol tracking
      if (conversationState.conversationId && conversationState.sessionId) {
        conversationState.messageSequence++;
        analyticsService.logMessage(
          conversationState.conversationId,
          conversationState.sessionId,
          conversationState.messageSequence,
          'user',
          `[SAFETY_VIOLATION] ${safetyCheck.violation?.type}: Interface locked`
        );
      }

      // Return spaces response - interface lockdown
      return NextResponse.json({
        content: "   ", // Spaces so API doesn't get empty content
        status: 'interface_locked',
        agent: 'noah'
      });
    }

    logger.debug('✅ Safety check passed - proceeding with normal processing');

    // Log user message (fire-and-forget, zero performance impact)
    if (conversationState.conversationId && conversationState.sessionId) {
      conversationState.messageSequence++;
      analyticsService.logMessage(
        conversationState.conversationId,
        conversationState.sessionId,
        conversationState.messageSequence,
        'user',
        lastMessage
      );
    }

    // Noah analyzes and decides internally - following user's exact pattern
    const analysis = analyzeRequest(lastMessage);
    logger.info('🧠 Noah analysis complete', {
      needsResearch: analysis.needsResearch,
      needsBuilding: analysis.needsBuilding,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence
    });

    let result: { content: string };
    let agentUsed: 'noah' | 'wanderer' | 'tinkerer' = 'noah';
    let agentStrategy = 'noah_direct';

    try {
      if (analysis.needsResearch) {
        logger.info('🔬 Noah delegating to Wanderer for research...');
        agentUsed = 'wanderer';
        agentStrategy = analysis.needsBuilding ? 'noah_wanderer_tinkerer' : 'noah_wanderer';
        const research = await withTimeout(wandererResearch(messages, context), WANDERER_TIMEOUT);
        if (analysis.needsBuilding) {
          logger.info('🔧 Noah chaining to Tinkerer for building...');
          agentUsed = 'tinkerer';
          const tool = await withTimeout(tinkererBuild(messages, research, context), TINKERER_TIMEOUT);
          result = { content: tool.content };
        } else {
          result = { content: research.content };
        }
      } else if (analysis.needsBuilding) {
        logger.info('🔧 Noah delegating to Tinkerer for building...');
        agentUsed = 'tinkerer';
        agentStrategy = 'noah_tinkerer';
        const tool = await withTimeout(tinkererBuild(messages, null, context), TINKERER_TIMEOUT);
        result = { content: tool.content };
      } else {
        // Noah handles directly - use fast model for tool generation, premium for conversation
        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
        const toolKeywords = ['create', 'build', 'make', 'calculator', 'timer', 'converter', 'tool', 'app', 'component'];
        const isToolGeneration = toolKeywords.some(keyword => lastMessage.includes(keyword));
        const taskType = isToolGeneration ? 'deepbuild' : 'default';
        logger.info(`🦉 Noah handling directly${isToolGeneration ? ' (tool generation)' : ' (conversation)'}...`);
        const llmProvider = createLLMProvider(taskType);
        const generatePromise = llmProvider.generateText({
          messages: messages.map((msg: ChatMessage) => ({
            role: msg.role,
            content: msg.content
          })),
          system: isToolGeneration ? getToolGenerationPrompt() : AI_CONFIG.CHAT_SYSTEM_PROMPT,
          temperature: 0.7
        });
        result = await withTimeout(generatePromise, NOAH_TIMEOUT);
      }
    } catch (agentError) {
      logger.error('🚨 Agent orchestration failed, Noah handling directly', { error: agentError });
      agentUsed = 'noah';
      agentStrategy = 'noah_direct_fallback';
      // Fallback to Noah Direct - use appropriate model based on request type
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
      const toolKeywords = ['create', 'build', 'make', 'calculator', 'timer', 'converter', 'tool', 'app', 'component'];
      const isToolGeneration = toolKeywords.some(keyword => lastMessage.includes(keyword));
      const taskType = isToolGeneration ? 'deepbuild' : 'default';
      const llmProvider = createLLMProvider(taskType);
      const generatePromise = llmProvider.generateText({
        messages: messages.map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content
        })),
        system: isToolGeneration ? getToolGenerationPrompt() : AI_CONFIG.CHAT_SYSTEM_PROMPT,
        temperature: 0.7
      });
      result = await withTimeout(generatePromise, NOAH_TIMEOUT);
    }

    const responseTime = Date.now() - startTime;
    logger.info('✅ Noah response generated', {
      responseLength: result.content.length,
      responseTime
    });

    // Log assistant response (fire-and-forget, zero performance impact)
    if (conversationState.conversationId && conversationState.sessionId) {
      conversationState.messageSequence++;
      analyticsService.logMessage(
        conversationState.conversationId,
        conversationState.sessionId,
        conversationState.messageSequence,
        'assistant',
        result.content,
        responseTime,
        agentUsed
      );
      
      // Log agent strategy for transparency in message metadata
      if (agentStrategy !== 'noah_direct') {
        logger.info('Agent orchestration completed', {
          strategy: agentStrategy,
          finalAgent: agentUsed,
          responseLength: result.content.length
        });
      }
    }

    // Process for artifacts using established workflow with analytics integration
    const parsed = await ArtifactService.handleArtifactWorkflow(
      result.content,
      lastMessage,
      context.sessionId,
      conversationState,
      agentUsed,
      agentStrategy
    );

    let noahContent = result.content;

    // If artifact was created, add to session storage and update messaging
    if (parsed.hasArtifact && parsed.title && parsed.content && context.sessionId) {
      // Add artifact to session storage
      const artifactId = `${context.sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = context.sessionId;
      
      if (!sessionArtifacts.has(sessionId)) {
        sessionArtifacts.set(sessionId, []);
      }
      
      sessionArtifacts.get(sessionId)!.push({
        title: parsed.title,
        content: parsed.content,
        timestamp: Date.now(),
        agent: agentUsed,
        id: artifactId
      });

      const lines = result.content.split('\n');
      const firstFiveLines = lines.slice(0, 5).join('\n');
      const hasMoreContent = lines.length > 5;

      // Updated messaging per user request
      const redirectMessage = `\n\nPlease see the toolbox for the full text. If it's code-based, save the download as an html file and open in a browser.`;
      
      // Natural conversation continuation
      const continuationMessage = `\n\nWhat would you like to build next, or do you have questions about how this works?`;

      if (hasMoreContent) {
        noahContent = `${firstFiveLines}${redirectMessage}${continuationMessage}`;
      } else {
        noahContent = `${result.content}${redirectMessage}${continuationMessage}`;
      }
    }

    const response: ChatResponse = {
      content: noahContent,
      status: 'success',
      agent: agentUsed,
      agentStrategy: agentStrategy // Show full orchestration path
    };

    // Include artifact in response for frontend processing
    if (parsed.hasArtifact && parsed.title && parsed.content) {
      response.artifact = {
        title: parsed.title,
        content: parsed.content
      };
    }

    // Include session artifacts for accumulated toolbox - fetch from database
    if (context.sessionId) {
      try {
        const artifactsResult = await analyticsPool.executeQuery<Array<{ 
          id: string; 
          title: string; 
          content: string; 
          created_at: string; 
          generation_agent: string; 
        }>>(
          'SELECT id, title, content, created_at, generation_agent FROM generated_tools WHERE session_id = $1 ORDER BY created_at DESC',
          [context.sessionId]
        );
        
        if (artifactsResult && artifactsResult.length > 0) {
          response.sessionArtifacts = artifactsResult.map(artifact => ({
            id: artifact.id,
            title: artifact.title,
            content: artifact.content,
            timestamp: new Date(artifact.created_at).getTime(),
            agent: artifact.generation_agent || 'noah'
          }));
        }
      } catch (error) {
        logger.error('Failed to fetch session artifacts for response', { error });
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('💥 Noah chat failed', { error, responseTime });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userFriendlyMessage = `I'm experiencing technical difficulties. The specific issue: ${errorMessage}`;

    if (errorMessage.includes('timeout')) {
      userFriendlyMessage = `I'm taking longer than usual to respond. This might be a good time to tell me to get my act together. The technical issue is: ${errorMessage}`;
    }

    return NextResponse.json({
      content: userFriendlyMessage,
      status: 'error',
      agent: 'noah'
    });
  }
}

/**
 * Fast path for simple factual questions only - tool creation always uses full artifact processing
 */
function isSimpleQuestion(content: string): boolean {
  const contentLower = content.toLowerCase();
  
  // Simple factual questions only
  const simpleFactual = [
    'what is', 'who is', 'when is', 'where is', 'how many', 'what are',
    'capital of', 'population of', 'currency of', 'language of',
    'definition of', 'meaning of', 'explain', 'define'
  ];
  
  // Tool creation keywords should NOT use fast path
  const toolCreationKeywords = [
    'create', 'build', 'make', 'calculator', 'timer', 'converter', 'tool', 'app', 'component'
  ];
  
  const isFactual = simpleFactual.some(pattern => contentLower.includes(pattern)) && content.length < 100;
  const isToolCreation = toolCreationKeywords.some(pattern => contentLower.includes(pattern));
  
  return isFactual && !isToolCreation;
}

/**
 * Streaming Noah chat handler - with fast path for simple questions
 */
async function noahStreamingChatHandler(req: NextRequest, context: LoggingContext) {
  const startTime = Date.now();
  logger.info('🦉 Noah processing streaming request');

  try {
    // Parse request with timeout protection
    const parsePromise = req.json();
    const { messages, skepticMode } = await withTimeout(parsePromise, 2000);
    
    // Store parsed body in context for logging middleware
    context.requestBody = { messages, skepticMode };

    // CRITICAL: Validate messages before accessing
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const model = AI_CONFIG.getProvider() === 'openai' ? openai(AI_CONFIG.getModel()) : anthropic(AI_CONFIG.getModel());
      return streamText({
        model,
        messages: [{ role: 'assistant', content: "I didn't receive any messages to respond to. Want to try sending me something?" }],
        temperature: 0.7,
      }).toTextStreamResponse();
    }

    // Initialize conversation state with analytics (required for all paths)
    const conversationState = await initializeConversationState(req, context, skepticMode || false);

    const streamingLastMessage = messages[messages.length - 1]?.content || '';
    
    // 🛡️ SAFETY CHECK - Required for all paths, including fast path
    const streamingSafetyCheck = await NoahSafetyService.checkUserMessage(
      streamingLastMessage,
      conversationState.sessionId || undefined,
      conversationState.conversationId || undefined,
      messages.slice(0, -1).map(m => m.content)
    );

    if (streamingSafetyCheck.radioSilence) {
      logger.warn('🔴 Radio silence activated - safety violation detected', {
        violationType: streamingSafetyCheck.violation?.type,
        reason: streamingSafetyCheck.violation?.reason,
        sessionId: conversationState.sessionId?.substring(0, 8) + '...'
      });

      // Log the attempted violation 
      if (conversationState.conversationId && conversationState.sessionId) {
        conversationState.messageSequence++;
        analyticsService.logMessage(
          conversationState.conversationId,
          conversationState.sessionId,
          conversationState.messageSequence,
          'user',
          `[SAFETY_VIOLATION] ${streamingSafetyCheck.violation?.type}: Content filtered`
        );
      }

      // Return empty stream - radio silence
      const model = AI_CONFIG.getProvider() === 'openai' ? openai(AI_CONFIG.getModel()) : anthropic(AI_CONFIG.getModel());
      return streamText({
        model,
        messages: [{ role: 'assistant', content: '' }],
        temperature: 0.7,
      }).toTextStreamResponse();
    }

    // Fast path for simple questions - AFTER safety and analytics
    if (isSimpleQuestion(streamingLastMessage)) {
      logger.info('🚀 Fast path for simple question (post-safety)');
      
      // Log user message (required for analytics)
      if (conversationState.conversationId && conversationState.sessionId) {
        conversationState.messageSequence++;
        analyticsService.logMessage(
          conversationState.conversationId,
          conversationState.sessionId,
          conversationState.messageSequence,
          'user',
          streamingLastMessage
        );
      }

      const model = AI_CONFIG.getProvider() === 'openai' ? openai(AI_CONFIG.getModel()) : anthropic(AI_CONFIG.getModel());
      
      return streamText({
        model,
        messages: messages.map((msg: ChatMessage) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
        temperature: 0.3, // Lower temperature for factual questions
        onFinish: async (completion) => {
          const responseTime = Date.now() - startTime;
          logger.info('✅ Noah fast path completed', {
            responseLength: completion.text.length,
            responseTime
          });
          
          // Log assistant response (required for analytics)
          if (conversationState.conversationId && conversationState.sessionId) {
            conversationState.messageSequence++;
            analyticsService.logMessage(
              conversationState.conversationId,
              conversationState.sessionId,
              conversationState.messageSequence,
              'assistant',
              completion.text,
              responseTime,
              'noah'
            );
          }
        }
      }).toTextStreamResponse();
    }

    logger.debug('✅ Safety check passed - proceeding with complex processing');

    // Log user message (fire-and-forget, same as existing)
    if (conversationState.conversationId && conversationState.sessionId) {
      conversationState.messageSequence++;
      analyticsService.logMessage(
        conversationState.conversationId,
        conversationState.sessionId,
        conversationState.messageSequence,
        'user',
        streamingLastMessage
      );
    }

    // Noah analyzes and decides internally (same logic as existing)
    const analysis = analyzeRequest(streamingLastMessage);
    logger.info('🧠 Noah analysis complete', {
      needsResearch: analysis.needsResearch,
      needsBuilding: analysis.needsBuilding,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence
    });

    let agentUsed: 'noah' | 'wanderer' | 'tinkerer' = 'noah';
    let agentStrategy = 'noah_direct';
    let responseContent = '';

    try {
      // Handle multi-agent orchestration (reuse existing logic)
      if (analysis.needsResearch) {
        logger.info('🔬 Noah delegating to Wanderer for research...');
        agentUsed = 'wanderer';
        agentStrategy = analysis.needsBuilding ? 'noah_wanderer_tinkerer' : 'noah_wanderer';
        const research = await withTimeout(wandererResearch(messages, context), WANDERER_TIMEOUT);
        if (analysis.needsBuilding) {
          logger.info('🔧 Noah chaining to Tinkerer for building...');
          agentUsed = 'tinkerer';
          const tool = await withTimeout(tinkererBuild(messages, research, context), TINKERER_TIMEOUT);
          responseContent = tool.content;
        } else {
          responseContent = research.content;
        }
      } else if (analysis.needsBuilding) {
        logger.info('🔧 Noah delegating to Tinkerer for building...');
        agentUsed = 'tinkerer';
        agentStrategy = 'noah_tinkerer';
        const tool = await withTimeout(tinkererBuild(messages, null, context), TINKERER_TIMEOUT);
        responseContent = tool.content;
      } else {
        // Noah handles directly with streaming
        logger.info('🦉 Noah handling directly with streaming...');
        const model = AI_CONFIG.getProvider() === 'openai' ? openai(AI_CONFIG.getModel()) : anthropic(AI_CONFIG.getModel());
        
        return streamText({
          model,
          messages: messages.map((msg: ChatMessage) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          })),
          system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
          temperature: 0.7,
          onFinish: async (completion) => {
            const responseTime = Date.now() - startTime;
            logger.info('✅ Noah streaming response completed', {
              responseLength: completion.text.length,
              responseTime
            });
            
            // Log assistant response (fire-and-forget, same as existing)
            if (conversationState.conversationId && conversationState.sessionId) {
              conversationState.messageSequence++;
              analyticsService.logMessage(
                conversationState.conversationId,
                conversationState.sessionId,
                conversationState.messageSequence,
                'assistant',
                completion.text,
                responseTime,
                agentUsed
              );
            }

            // Process artifacts in background (non-blocking)
            ArtifactService.handleArtifactWorkflow(
              completion.text,
              streamingLastMessage,
              context.sessionId,
              conversationState
            ).catch(error => logger.warn('Artifact processing failed', { error }));
          }
        }).toTextStreamResponse();
      }
    } catch (agentError) {
      logger.error('🚨 Agent orchestration failed, Noah streaming directly', { error: agentError });
      agentUsed = 'noah';
      agentStrategy = 'noah_direct_fallback';
      
      // Fallback to Noah Direct streaming
      const model = AI_CONFIG.getProvider() === 'openai' ? openai(AI_CONFIG.getModel()) : anthropic(AI_CONFIG.getModel());
      return streamText({
        model,
        messages: messages.map((msg: ChatMessage) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        system: AI_CONFIG.CHAT_SYSTEM_PROMPT,
        temperature: 0.7,
        onFinish: async (completion) => {
          const responseTime = Date.now() - startTime;
          logger.info('✅ Noah fallback streaming response completed', {
            responseLength: completion.text.length,
            responseTime
          });
          
          // Log response
          if (conversationState.conversationId && conversationState.sessionId) {
            conversationState.messageSequence++;
            analyticsService.logMessage(
              conversationState.conversationId,
              conversationState.sessionId,
              conversationState.messageSequence,
              'assistant',
              completion.text,
              responseTime,
              agentUsed
            );
          }
        }
      }).toTextStreamResponse();
    }

    // For non-streaming agents (Wanderer/Tinkerer), return pre-computed response as stream
    const responseTime = Date.now() - startTime;
    logger.info('✅ Noah agent response completed', {
      responseLength: responseContent.length,
      responseTime,
      agent: agentUsed
    });

    // Log assistant response
    if (conversationState.conversationId && conversationState.sessionId) {
      conversationState.messageSequence++;
      analyticsService.logMessage(
        conversationState.conversationId,
        conversationState.sessionId,
        conversationState.messageSequence,
        'assistant',
        responseContent,
        responseTime,
        agentUsed
      );
    }

    // Process artifacts
    const parsed = await ArtifactService.handleArtifactWorkflow(
      responseContent,
      streamingLastMessage,
      context.sessionId,
      conversationState
    );

    let finalContent = responseContent;
    if (parsed.hasArtifact && parsed.title && parsed.content) {
      const lines = responseContent.split('\n');
      const firstFiveLines = lines.slice(0, 5).join('\n');
      const hasMoreContent = lines.length > 5;

      if (hasMoreContent) {
        finalContent = `${firstFiveLines}\n\n*I've created a tool for you! Check your toolbox for the complete "${parsed.title}" with all the details.*`;
      } else {
        finalContent = `${responseContent}\n\n*This tool has been saved to your toolbox as "${parsed.title}" for easy access.*`;
      }
    }

    // Return pre-computed response with proper chunk-based streaming
    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          let index = 0;
          const chunkSize = 3; // Stream 3 characters at a time for natural typing effect
          
          const streamChunk = () => {
            if (index < finalContent.length) {
              const chunk = finalContent.slice(index, index + chunkSize);
              controller.enqueue(encoder.encode(chunk));
              index += chunkSize;
              
              // Add small delay for natural streaming effect
              setTimeout(streamChunk, 30); // 30ms delay between chunks
            } else {
              controller.close();
            }
          };
          
          streamChunk();
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'x-session-id': conversationState.sessionId || 'unknown'
        }
      }
    );

  } catch (error) {
    logger.error('💥 Noah streaming handler failed', { error });
    const errorMessage = error instanceof Error ? error.message : String(error);
    let userFriendlyMessage = `I'm experiencing technical difficulties. The specific issue: ${errorMessage}`;

    if (errorMessage.includes('timeout')) {
      userFriendlyMessage = `I'm taking longer than usual to respond. This might be a good time to tell me to get my act together. The technical issue is: ${errorMessage}`;
    }

    const model = AI_CONFIG.getProvider() === 'openai' ? openai(AI_CONFIG.getModel()) : anthropic(AI_CONFIG.getModel());
    return streamText({
      model,
      messages: [{ role: 'assistant', content: userFriendlyMessage }],
      temperature: 0,
    }).toTextStreamResponse();
  }
}

/**
 * Main POST handler - processes all chat requests
 * Tool creation always uses non-streaming for proper artifact processing
 */
export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  // Check if this is a tool creation request
  const body = await req.clone().json().catch(() => ({ messages: [] }));
  const lastMessage = body?.messages?.[body.messages.length - 1]?.content?.toLowerCase() || '';
  
  const toolCreationKeywords = [
    'create', 'build', 'make', 'calculator', 'timer', 'converter', 'tool', 'app', 'component'
  ];
  const isToolCreation = toolCreationKeywords.some(keyword => lastMessage.includes(keyword));
  
  // Force tool creation to use non-streaming for proper artifact processing
  if (isToolCreation) {
    return withLogging(noahChatHandler)(req);
  }
  
  // Check if client supports streaming for other requests
  const acceptHeader = req.headers.get('accept') || '';
  const isStreamingRequest = acceptHeader.includes('text/stream') || req.headers.get('x-streaming') === 'true';
  
  if (isStreamingRequest) {
    // Streaming handler returns Response directly (not wrapped in withLogging)
    const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return noahStreamingChatHandler(req, { sessionId, startTime: Date.now() });
  } else {
    return withLogging(noahChatHandler)(req);
  }
}

/**
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  return NextResponse.json({
    status: 'healthy',
    agent: 'noah',
    capabilities: ['chat', 'tool-generation', 'conversation'],
    model: AI_CONFIG.getModel(),
    avg_response_time: '2-5s'
  });
}