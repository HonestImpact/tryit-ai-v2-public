'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('trust-recovery-ui');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  challenged?: boolean;
}

interface Artifact {
  title: string;
  content: string;
}

// Memoized individual message component for performance
const MessageComponent = React.memo(({ 
  message, 
  index, 
  onChallenge, 
  isAlreadyChallenged,
  isLoading,
  interfaceLocked
}: {
  message: Message;
  index: number;
  onChallenge: (index: number) => void;
  isAlreadyChallenged: boolean;
  isLoading: boolean;
  interfaceLocked: boolean;
}) => {
  const handleChallenge = useCallback(() => onChallenge(index), [onChallenge, index]);

  return (
    <div className="group">
      {message.role === 'user' ? (
        <div className="flex justify-end">
          <div className="max-w-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl rounded-br-md shadow-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="text-xs text-slate-500 mt-2 text-right">
              {new Date(message.timestamp!).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-start">
          <div className="max-w-2xl">
            <div className={`bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-bl-md shadow-sm transition-shadow duration-200 ${interfaceLocked ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'}`}>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-600">N</span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-slate-500">
                      {new Date(message.timestamp!).toLocaleTimeString()}
                    </div>
                    {!isAlreadyChallenged && !isLoading && !interfaceLocked && (
                      <button
                        onClick={handleChallenge}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        Challenge this →
                      </button>
                    )}
                    {isAlreadyChallenged && (
                      <div className="text-xs text-green-600 font-medium">
                        ✓ Challenged
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MessageComponent.displayName = 'MessageComponent';

export default function TrustRecoveryProtocol() {
  // Trust Recovery Protocol state (preserved)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [sessionArtifacts, setSessionArtifacts] = useState<Array<{
    title: string;
    content: string;
    timestamp: number;
    agent: string;
    id: string;
  }>>([]);
  const [showReasoning] = useState(false);
  const [reasoning] = useState('');
  const [skepticMode, setSkepticMode] = useState(false);
  const [trustLevel, setTrustLevel] = useState(50);
  const [challengedMessages, setChallengedMessages] = useState<Set<number>>(new Set());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [interfaceLocked, setInterfaceLocked] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Optimized auto-scroll - debounced to prevent performance issues with long conversations
  useEffect(() => {
    if (messages.length > 0) {
      // Debounce scroll to prevent excessive calls during rapid message updates
      const scrollTimeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [messages.length]); // Only depend on length, not full messages array

  // Initialize messages and focus input on page load
  useEffect(() => {
    // Ensure page starts at the top
    window.scrollTo(0, 0);

    // Set initial message
    setMessages([
      {
        role: 'assistant',
        content: "Hi, I'm Noah. I don't know why you're here or what you expect. Most AI tools oversell and underdeliver. This one's different, but you'll have to see for yourself. Want to test it with something small?",
        timestamp: Date.now()
      }
    ]);

    // Focus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Note: Artifact logging now handled automatically by the chat API

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || interfaceLocked) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const newMessages = [...messages, {
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now()
    }];
    setMessages(newMessages);

    try {
      // Check if this looks like a tool creation request
      const toolKeywords = ['calculator', 'timer', 'converter', 'form', 'tracker', 'tool', 'widget', 'app', 'create', 'build', 'make'];
      const isToolRequest = toolKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      // Use non-streaming for tool creation to get proper truncation
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (!isToolRequest) {
        headers['x-streaming'] = 'true';
      }

      // Call our API route 
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: newMessages,
          skepticMode: skepticMode
        }),
      });

      // Capture session ID from response headers for artifact logging
      const sessionIdFromResponse = response.headers.get('x-session-id');
      if (sessionIdFromResponse && !currentSessionId) {
        setCurrentSessionId(sessionIdFromResponse);
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle response based on type
      if (isToolRequest) {
        // Handle non-streaming JSON response for tool creation
        const data = await response.json();
        
        // Handle interface lockdown - Noah locks all interactions  
        if (data.status === 'interface_locked') {
          setInterfaceLocked(true);
          // Add the spaces response to show the lockdown
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.content, // Contains spaces
            timestamp: Date.now()
          }]);
          return;
        }
        
        // Add the assistant message with truncated content
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          timestamp: Date.now()
        }]);

        // Handle artifact if present
        if (data.artifact) {
          logger.info('Tool artifact received', { title: data.artifact.title });
          setTimeout(() => {
            setArtifact({
              title: data.artifact.title,
              content: data.artifact.content
            });
          }, 800);
        }

        // Handle session artifacts for accumulated toolbox
        if (data.sessionArtifacts) {
          logger.info('Session artifacts received', { count: data.sessionArtifacts.length });
          setSessionArtifacts(data.sessionArtifacts);
        }

        // Adjust trust level
        if (data.content.toLowerCase().includes('uncertain') || data.content.toLowerCase().includes('not sure')) {
          setTrustLevel(prev => Math.min(100, prev + 5));
        }
        
      } else if (response.body) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        // Add placeholder message for streaming
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          timestamp: Date.now()
        }]);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;

            // Update the last message with accumulated content
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedContent
              };
              return updated;
            });
          }
        } finally {
          reader.releaseLock();
        }

        // Adjust trust level based on response quality
        if (accumulatedContent.toLowerCase().includes('uncertain') || accumulatedContent.toLowerCase().includes('not sure')) {
          setTrustLevel(prev => Math.min(100, prev + 5));
        }

        // Check for artifacts after streaming completes
        try {
          if (currentSessionId || sessionIdFromResponse) {
            const sessionId = sessionIdFromResponse || currentSessionId;
            const artifactResponse = await fetch(`/api/artifacts?sessionId=${sessionId}`);
            if (artifactResponse.ok) {
              const artifactData = await artifactResponse.json();
              if (artifactData.artifact) {
                logger.info('Artifact received after streaming', { title: artifactData.artifact.title });
                setTimeout(() => {
                  setArtifact({
                    title: artifactData.artifact.title,
                    content: artifactData.artifact.content
                  });
                }, 800);
              }
              // Handle session artifacts for accumulated toolbox
              if (artifactData.sessionArtifacts) {
                logger.info('Session artifacts received after streaming', { count: artifactData.sessionArtifacts.length });
                setSessionArtifacts(artifactData.sessionArtifacts);
              }
            }
          }
        } catch (artifactError) {
          logger.warn('Failed to fetch artifacts', { error: artifactError });
        }
      } else {
        // Fallback to non-streaming if no body
        const data = await response.json();
        
        // Handle interface lockdown - Noah locks all interactions  
        if (data.status === 'interface_locked') {
          setInterfaceLocked(true);
          // Add the spaces response to show the lockdown
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.content, // Contains spaces
            timestamp: Date.now()
          }]);
          return;
        }
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          timestamp: Date.now()
        }]);

        if (data.artifact) {
          logger.info('Artifact received from API', { title: data.artifact.title });
          setTimeout(() => {
            setArtifact({
              title: data.artifact.title,
              content: data.artifact.content
            });
          }, 800);
        }

        // Handle session artifacts for accumulated toolbox
        if (data.sessionArtifacts) {
          logger.info('Session artifacts received', { count: data.sessionArtifacts.length });
          setSessionArtifacts(data.sessionArtifacts);
        }
      }

    } catch (error) {
      logger.error('Chat request failed', { error: error instanceof Error ? error.message : String(error) });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong on my end. Want to try that again? I learn from failures.',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  };

  const downloadArtifact = useCallback(() => {
    if (interfaceLocked) return;
    logger.debug('Download initiated', { title: artifact?.title });
    if (!artifact) {
      logger.warn('Download attempted with no artifact available');
      return;
    }

    const content = `${artifact.title}\n\n${artifact.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('Artifact download completed', { filename: artifact.title });
  }, [artifact]);

  const downloadIndividualArtifact = useCallback((sessionArtifact: {
    title: string;
    content: string;
    id: string;
  }) => {
    if (interfaceLocked) return;
    logger.debug('Individual download initiated', { title: sessionArtifact.title, id: sessionArtifact.id });

    const content = `${sessionArtifact.title}\n\n${sessionArtifact.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionArtifact.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('Individual artifact download completed', { filename: sessionArtifact.title, id: sessionArtifact.id });
  }, []);

  const toggleSkepticMode = useCallback(() => {
    if (interfaceLocked) return;
    setSkepticMode(prev => !prev);
    setTrustLevel(prev => Math.max(0, prev - 10));
  }, [interfaceLocked]);

  const challengeMessage = useCallback(async (messageIndex: number) => {
    if (isLoading || interfaceLocked) return;

    const message = messages[messageIndex];
    if (message.role !== 'assistant') return;

    // Mark as challenged
    setChallengedMessages(prev => new Set(prev).add(messageIndex));

    // Increase trust level for challenging (shows the system respects skepticism)
    setTrustLevel(prev => Math.min(100, prev + 3));

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(0, messageIndex + 1),
            {
              role: 'user',
              content: `I want to challenge your previous response: "${message.content}". Can you think about this differently or explain your reasoning more clearly?`
            }
          ],
          trustLevel,
          skepticMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Handle radio silence - Noah chose not to respond to challenge
      if (data.status === 'radio_silence') {
        // Don't add any message - Noah goes silent
        return;
      }

      // Add the challenge response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: Date.now()
      }]);

      // Adjust trust level based on response quality
      if (data.content.toLowerCase().includes('uncertain') || data.content.toLowerCase().includes('not sure')) {
        setTrustLevel(prev => Math.min(100, prev + 5));
      }

      // Handle artifact if present in challenge response
      if (data.artifact) {
        logger.info('Challenge artifact received', { title: data.artifact.title });

        // Set artifact state with smooth animation
        setTimeout(() => {
          setArtifact({
            title: data.artifact.title,
            content: data.artifact.content
          });
        }, 800);
      }

      // Handle session artifacts for accumulated toolbox
      if (data.sessionArtifacts) {
        logger.info('Challenge session artifacts received', { count: data.sessionArtifacts.length });
        setSessionArtifacts(data.sessionArtifacts);
      }

    } catch (error) {
      logger.error('Challenge request failed', { error: error instanceof Error ? error.message : String(error) });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I appreciate the challenge, but I\'m having trouble responding right now. Want to try that again?',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  }, [messages, trustLevel, skepticMode, isLoading]);

  // Memoized message list to prevent unnecessary re-renders
  const messagesWithMemoization = useMemo(() => {
    return messages.map((message, index) => (
      <MessageComponent
        key={`${index}-${message.timestamp}`} // Better key for memoization
        message={message}
        index={index}
        onChallenge={challengeMessage}
        isAlreadyChallenged={challengedMessages.has(index)}
        isLoading={isLoading}
        interfaceLocked={interfaceLocked}
      />
    ));
  }, [messages, challengedMessages, isLoading, challengeMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Header */}
      <header className="border-b border-slate-200/60 backdrop-blur-sm bg-white/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-3 sm:hidden">
            {/* Top Row - Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">TryIt-AI Kit</h1>
                  <p className="text-xs text-slate-500">Trust Recovery Protocol</p>
                </div>
              </div>
              
              {/* Skeptic Mode Toggle - Mobile */}
              <button
                onClick={toggleSkepticMode}
                className={`inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                  skepticMode ? 'bg-red-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                    skepticMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Bottom Row - Trust Level */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Trust Level</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000 ease-out"
                    style={{ width: `${trustLevel}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-500 w-8">{trustLevel}%</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-400">
              {skepticMode ? '🔍 Skeptic Mode: Verify Everything' : '👍 Standard Mode'}
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">TryIt-AI Kit</h1>
                <p className="text-sm text-slate-500">Trust Recovery Protocol</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Trust Level Indicator */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-slate-600">Trust Level</span>
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000 ease-out"
                    style={{ width: `${trustLevel}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-slate-500 w-8">{trustLevel}%</span>
              </div>

              {/* Skeptic Mode Toggle */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleSkepticMode}
                  className={`inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    skepticMode ? 'bg-red-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      skepticMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-600">
                  {skepticMode ? 'Skeptic Mode ON' : 'Skeptic Mode OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Hero Section */}
            <div className="mb-8 sm:mb-12">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-4">
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                For people who choose discernment over blind trust
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
                Your skepticism is <span className="text-blue-600">wisdom</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl">
            Most AI tools want your blind trust. This one earns it by letting you help define what good technology looks like.
          </p>
            </div>

            {/* Conversation */}
            <div className="space-y-6">
              {messagesWithMemoization}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-full sm:max-w-2xl">
                    <div className="bg-white border border-slate-200 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl rounded-bl-md shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-slate-600">N</span>
                        </div>
                        <div className="flex-1">
                          <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div className="mt-6 sm:mt-8 border-t border-slate-200 pt-6 sm:pt-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={skepticMode ? "Question everything. What would you like to test?" : "What would you like to try?"}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-500 bg-white shadow-sm text-base"
                    rows={3}
                    disabled={isLoading || interfaceLocked}
                  />
                  <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center space-x-2">
                    <div className="hidden sm:block text-xs text-slate-400">
                      Press Enter to send
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-2 sm:p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-6 lg:mt-0">
            {/* Artifact Display */}
            {artifact && (
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Latest Tool</h3>
                  <button
                    onClick={downloadArtifact}
                    className="text-blue-600 hover:text-blue-700 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Download artifact"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-800 text-sm sm:text-base">{artifact.title}</h4>
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4 max-h-80 sm:max-h-96 overflow-y-auto">
                    <pre className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap font-mono">{artifact.content}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* Session Toolbox - All Generated Tools */}
            {sessionArtifacts && sessionArtifacts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    Your Toolbox ({sessionArtifacts.length})
                  </h3>
                  <div className="text-xs text-slate-500">
                    All conversation tools
                  </div>
                </div>
                <div className="space-y-3">
                  {sessionArtifacts.map((sessionArtifact, index) => (
                    <div key={sessionArtifact.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-medium text-slate-800 text-sm">{sessionArtifact.title}</h5>
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                              {sessionArtifact.agent}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mb-3">
                            {new Date(sessionArtifact.timestamp).toLocaleString()}
                          </div>
                          <div className="bg-slate-50 rounded p-2 max-h-32 overflow-y-auto">
                            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                              {sessionArtifact.content.substring(0, 200)}
                              {sessionArtifact.content.length > 200 ? '...' : ''}
                            </pre>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadIndividualArtifact(sessionArtifact)}
                          className="ml-3 text-blue-600 hover:text-blue-700 transition-colors duration-200 min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title={`Download ${sessionArtifact.title}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning Display */}
            {showReasoning && reasoning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm animate-fade-in-up mt-4 sm:mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-amber-900 mb-3 sm:mb-4">Reasoning Process</h3>
                <div className="text-xs sm:text-sm text-amber-800 whitespace-pre-wrap">{reasoning}</div>
              </div>
            )}

            {/* Trust Indicators - Hidden on mobile since it's in header */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">System Health</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Trust Recovery</span>
                    <span className="font-mono text-slate-500">{trustLevel}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${trustLevel}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {skepticMode ? '🔍 Skeptic mode enables deeper verification' : '👍 Standard interaction mode'}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">How This Works</h3>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-semibold text-sm sm:text-base">1.</span>
                  <span>Ask for anything you&apos;d like built or tested</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-semibold text-sm sm:text-base">2.</span>
                  <span>Challenge responses if they seem off</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-semibold">3.</span>
                  <span>Enable skeptic mode for stricter verification</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-semibold">4.</span>
                  <span>Trust level adjusts based on system reliability</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interface Lockdown Banner */}
      {interfaceLocked && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-red-200 bg-red-50 backdrop-blur-sm z-50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-800 font-medium text-sm">Interface Locked</p>
                  <p className="text-red-600 text-xs">Your message violated safety guidelines. Refresh to restore functionality.</p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Demo Video Section */}
      <div className="max-w-4xl mx-auto px-4 py-8 mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Intro Video</h3>
            <video
              controls
              preload="metadata"
              className="w-full rounded-lg"
              style={{ maxHeight: '400px' }}
            >
              <source src="/api/video?file=intro-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}