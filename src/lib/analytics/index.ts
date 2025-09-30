// Analytics Module - Clean export interface for Noah's analytics system
// Following the Golden Rule: Best, Cleanest, Fastest, Most Logical, Most Elegant

export { analyticsService } from './service';
export { analyticsDb } from './database';
export { generateSessionFingerprint, extractBrowserInfo, isValidSessionFingerprint } from './session';
export type { 
  SessionData, 
  ConversationData, 
  MessageData, 
  GeneratedToolData, 
  ToolUsageEvent,
  AnalyticsQueryOptions,
  PerformanceMetrics
} from './types';