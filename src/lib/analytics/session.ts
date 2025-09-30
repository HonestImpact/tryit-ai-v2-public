// Session Management - Privacy-first fingerprinting for Noah's analytics
// Elegant, GDPR-compliant session tracking without personal data

import crypto from 'crypto';

/**
 * Generate stable, privacy-preserving session fingerprint
 * Creates deterministic fingerprint that remains constant for the same user/day
 */
export function generateSessionFingerprint(
  userAgent?: string,
  ipAddress?: string,
  environment: string = 'development'
): string {
  // Create stable components - no randomness to ensure repeatability
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format for daily granularity
  const coarseIP = ipAddress ? ipAddress.split('.').slice(0, 3).join('.') + '.0' : 'unknown-ip'; // Privacy-safe IP
  
  const components = [
    userAgent || 'unknown-ua',
    coarseIP,
    environment,
    today // Daily granularity for privacy while maintaining session continuity
  ];

  // Hash the components for privacy - deterministic for same input
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 32); // Keep first 32 characters

  return `session_${fingerprint}`;
}

/**
 * Extract basic browser info for analytics (privacy-safe)
 */
export function extractBrowserInfo(userAgent?: string): {
  browser: string;
  platform: string;
  mobile: boolean;
} {
  if (!userAgent) {
    return { browser: 'unknown', platform: 'unknown', mobile: false };
  }

  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';

  // Platform detection
  let platform = 'unknown';
  if (ua.includes('windows')) platform = 'windows';
  else if (ua.includes('mac')) platform = 'macos';
  else if (ua.includes('linux')) platform = 'linux';
  else if (ua.includes('android')) platform = 'android';
  else if (ua.includes('ios')) platform = 'ios';

  // Mobile detection
  const mobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');

  return { browser, platform, mobile };
}

/**
 * Validate session fingerprint format
 */
export function isValidSessionFingerprint(fingerprint: string): boolean {
  return /^session_[a-f0-9]{32}$/.test(fingerprint);
}