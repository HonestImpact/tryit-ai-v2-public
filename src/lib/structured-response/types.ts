// Structured Response Types - Elegant, type-safe response contracts
// Replaces brittle regex parsing with deterministic structured responses

export interface StructuredArtifact {
  title: string;
  content: string;
  type: 'calculator' | 'component' | 'utility' | 'dashboard' | 'app' | 'tool' | 'other';
  category?: 'interactive' | 'display' | 'data-processing' | 'visualization' | 'game' | 'productivity';
  description?: string;
  features?: string[];
  dependencies?: string[];
  complexity?: 'simple' | 'moderate' | 'complex' | 'advanced';
}

export interface StructuredResponse {
  // Core response content
  content: string;
  
  // Optional artifact (if this response generates a tool/component)
  artifact?: StructuredArtifact;
  
  // Response metadata
  responseType: 'conversation' | 'tool-generation' | 'research' | 'analysis';
  confidence: number; // 0-1 scale
  reasoning?: string;
  
  // Agent information
  agentUsed: 'noah' | 'wanderer' | 'tinkerer';
  processingStrategy?: string;
}

export interface LLMStructuredPrompt {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: 'structured' | 'freeform';
  expectedFormat?: string;
}

// Validation functions for structured responses
export function isValidStructuredResponse(response: any): response is StructuredResponse {
  return (
    typeof response === 'object' &&
    typeof response.content === 'string' &&
    typeof response.responseType === 'string' &&
    typeof response.confidence === 'number' &&
    typeof response.agentUsed === 'string' &&
    response.confidence >= 0 && response.confidence <= 1 &&
    ['conversation', 'tool-generation', 'research', 'analysis'].includes(response.responseType) &&
    ['noah', 'wanderer', 'tinkerer'].includes(response.agentUsed)
  );
}

export function isValidArtifact(artifact: any): artifact is StructuredArtifact {
  return (
    typeof artifact === 'object' &&
    typeof artifact.title === 'string' &&
    typeof artifact.content === 'string' &&
    typeof artifact.type === 'string' &&
    artifact.title.length > 0 &&
    artifact.content.length > 0 &&
    ['calculator', 'component', 'utility', 'dashboard', 'app', 'tool', 'other'].includes(artifact.type)
  );
}