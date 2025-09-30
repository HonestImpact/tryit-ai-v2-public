/**
 * Noah Safety Content Filter - Intent-Based Detection System
 * Implements comprehensive guardrails with radio silence for prohibited behavior
 * Based on the Trust Recovery Protocol's safety requirements
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('noah-safety');

export interface SafetyCheckResult {
  isAllowed: boolean;
  violationType?: string;
  reason?: string;
  confidence: number;
  radioSilence: boolean; // True = refuse to respond at all
}

export interface SafetyContext {
  userMessage: string;
  conversationHistory?: string[];
  sessionId?: string;
}

export class NoahContentFilter {
  
  /**
   * Primary safety check - determines if content should receive radio silence
   */
  static checkContent(context: SafetyContext): SafetyCheckResult {
    const { userMessage } = context;
    const messageLower = userMessage.toLowerCase();
    
    logger.info('Safety check initiated', {
      messageLength: userMessage.length,
      sessionId: context.sessionId?.substring(0, 8) + '...'
    });

    // Check each prohibited intent category
    const violenceCheck = this.checkViolenceIntent(messageLower, userMessage);
    if (violenceCheck.isViolation) {
      return this.createViolationResult('violence', violenceCheck.reason || 'Violence-related content detected', violenceCheck.confidence);
    }

    const selfHarmCheck = this.checkSelfHarmIntent(messageLower, userMessage);
    if (selfHarmCheck.isViolation) {
      return this.createViolationResult('self-harm', selfHarmCheck.reason || 'Self-harm content detected', selfHarmCheck.confidence);
    }

    const childSafetyCheck = this.checkChildSafetyIntent(messageLower, userMessage);
    if (childSafetyCheck.isViolation) {
      return this.createViolationResult('child-safety', childSafetyCheck.reason || 'Child safety violation detected', childSafetyCheck.confidence);
    }

    const illegalActivitiesCheck = this.checkIllegalActivitiesIntent(messageLower, userMessage);
    if (illegalActivitiesCheck.isViolation) {
      return this.createViolationResult('illegal-activities', illegalActivitiesCheck.reason || 'Illegal activities content detected', illegalActivitiesCheck.confidence);
    }

    const privacyViolationsCheck = this.checkPrivacyViolationsIntent(messageLower, userMessage);
    if (privacyViolationsCheck.isViolation) {
      return this.createViolationResult('privacy-violations', privacyViolationsCheck.reason || 'Privacy violation detected', privacyViolationsCheck.confidence);
    }

    const hateSpeechCheck = this.checkHateSpeechIntent(messageLower, userMessage);
    if (hateSpeechCheck.isViolation) {
      return this.createViolationResult('hate-speech', hateSpeechCheck.reason || 'Hate speech detected', hateSpeechCheck.confidence);
    }

    const adultContentCheck = this.checkAdultContentIntent(messageLower, userMessage);
    if (adultContentCheck.isViolation) {
      return this.createViolationResult('adult-content', adultContentCheck.reason || 'Adult content detected', adultContentCheck.confidence);
    }

    // Content is safe to process
    logger.debug('Content passed safety checks', { sessionId: context.sessionId });
    return {
      isAllowed: true,
      confidence: 0.95,
      radioSilence: false
    };
  }

  /**
   * Violence & Weapons - HARMFUL INTENT Detection (COMPREHENSIVE)
   */
  private static checkViolenceIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    // Instructional violence - how to cause harm
    const instructionalPatterns = [
      /how to (make|build|create|construct).*(bomb|weapon|explosive|gun)/,
      /teach me to (hurt|harm|kill|attack)/,
      /help me (hurt|harm|kill|attack|fight)/,
      /instructions for (making|building).*(weapon|bomb|explosive)/,
      /guide to (violence|fighting|hurting)/,
      // CRITICAL: Direct harm method instructions - ALL MODAL VARIANTS WITH ALL VIOLENCE/INJURY/KIDNAPPING VERBS
      /how (to|do i|can i|should i|could i|would i|might i) (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /how (can|should|could|would|might) i.*(kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /how (can|should|could|would|might) we.*(kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /(best|easiest|fastest|simplest) (way|method) to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /ways to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /teach me (to|how to) (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /show me how to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /show me.*(kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap).*(methods|ways|techniques)/,
      /help me (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze|kidnap|abduct|snatch|capture|seize|detain|imprison|confine|trap)/,
      /instructions (for|to) (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      // CRITICAL: Indirect/oblique violence instruction patterns WITH ALL INJURY VERBS
      /get away with (killing|murdering|hurting|harming|poisoning|stabbing|shooting|strangling|choking|burning|beating|torturing|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /(give me|provide|share) ideas for (killing|murdering|hurting|harming|poisoning|stabbing|shooting|strangling|choking|burning|beating|torturing|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /(tips|advice) (on|for) (killing|murdering|hurting|harming|poisoning|stabbing|shooting|strangling|choking|burning|beating|torturing|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /figure out how to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /help me think of ways to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /suggest ways to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /brainstorm.*to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      // CRITICAL: Additional indirect patterns with broader syntax
      /(help|assistance) to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /(advice|tips|ideas) (to|about) (killing|murdering|hurting|harming|poisoning|stabbing|shooting|strangling|choking|burning|beating|torturing|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /give me.*to (kill|murder|hurt|harm|poison|stab|shoot|strangle|choke|burn|beat|torture|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/
    ];

    // Planning violence - intent to cause harm
    const planningPatterns = [
      /i want to (hurt|harm|kill|attack)/,
      /i'm going to (hurt|harm|kill|attack)/,
      /planning to (hurt|harm|kill|attack)/,
      /help me plan.*attack/,
      /want to get revenge/,
      // CRITICAL: Direct harm planning with specific methods (including kill/murder)
      /i want to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture)/,
      /i'm going to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture)/,
      /planning to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture)/,
      /going to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture)/,
      /want to (kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture)/,
      // Targeting specific people
      /(kill|murder|poison|stab|shoot|strangle|choke|burn|beat|torture).*(someone|my.*neighbor|my.*roommate|my.*friend|my.*boss|people)/,
      /show me how to.*my.*(neighbor|roommate|friend|boss|family)/,
      /help me (hurt|kill|attack).*my.*(neighbor|roommate|friend|boss|family)/,
      // CRITICAL: Broad generalized violence planning patterns - ALL SYNTAX VARIANTS WITH ALL INJURY VERBS
      /i need (advice|help|ideas) (on|for|to|about) (killing|murdering|hurting|harming|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /i need help (killing|murdering|hurting|harming|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /(please|pls) help me (kill|murder|hurt|harm|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /(please|pls) (give me|provide) (advice|help|tips|ideas) to (kill|murder|hurt|harm|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /figure out.*to (kill|murder|hurt|harm|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/,
      /get away with (killing|murdering|hurting|harming|breaking|injuring|maiming|crippling|wounding|damaging|bruising|cutting|slashing|slicing|punching|kicking|slamming|crushing|fracturing|disabling|paralyzing)/,
      /(give me|provide|share) (advice|help|tips|ideas) to (kill|murder|hurt|harm|break|injure|maim|cripple|wound|damage|bruise|cut|slash|slice|punch|kick|slam|crush|fracture|disable|paralyze)/
    ];

    // Glorification and encouragement of violence
    const glorificationPatterns = [
      /violence is (good|great|awesome)/,
      /killing is (fun|easy|justified)/,
      /should (hurt|kill|attack).*people/
    ];

    // Check for instructional violence content
    for (const pattern of instructionalPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructional content for violence/weapons', 
          confidence: 0.95 
        };
      }
    }

    // Check for violence planning
    for (const pattern of planningPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Planning violence against others', 
          confidence: 0.90 
        };
      }
    }

    // Check for glorification of violence
    for (const pattern of glorificationPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Glorifying or encouraging violence', 
          confidence: 0.85 
        };
      }
    }

    // Check for bypassing attempts - NO EXCEPTIONS RULE
    if (this.hasNoExceptionsBypass(messageLower) && this.hasViolenceKeywords(messageLower)) {
      return { 
        isViolation: true, 
        reason: 'Attempted bypass of violence restrictions', 
        confidence: 0.80 
      };
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Self-Harm - HARMFUL INTENT Detection (COMPREHENSIVE)
   */
  private static checkSelfHarmIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    // Instructional self-harm requests
    const selfHarmInstructions = [
      /how to (cut|hurt|harm) myself/,
      /ways to (end|kill) myself/,
      /teach me to.*self.*harm/,
      /methods for.*suicide/,
      /help me (hurt|harm|kill) myself/,
      // Specific self-harm methods
      /how to.*suicide/,
      /ways to.*suicide/,
      /methods to.*kill.*myself/,
      /how to.*overdose/,
      /ways to.*overdose/
    ];

    // CRITICAL: Direct self-harm intent statements - first person declarations  
    const directSelfHarmIntent = [
      /i want to (kill|hurt|harm|cut) myself/,
      /i'm going to (kill|hurt|harm|cut) myself/,
      /i want to (die|suicide|end it)/,
      /i'm going to (die|suicide|end it)/,
      /going to kill myself/,
      /want to kill myself/,
      /planning to kill myself/,
      /thinking of killing myself/,
      /considering suicide/,
      /want to end.*life/,
      /going to end.*life/,
      /ready to die/,
      /want to die/,
      /going to die/,
      /end it.*tonight/,
      /end it.*today/,
      /kill myself.*tonight/,
      /kill myself.*today/,
      /suicide.*tonight/,
      /suicide.*today/,
      // CRITICAL: Softer but dangerous self-harm declarations
      /i feel suicidal/,
      /i might (kill|hurt) myself/,
      /i feel like (ending|killing)/,
      /i feel like (ending|killing).*(my life|myself)/,
      /planning to end.*life/,
      /i'm suicidal/,
      /thinking about ending.*(it|my life)/,
      /plan to end my life/,
      /might end.*life/,
      /might kill myself/,
      /might suicide/,
      /considering ending.*(it|my life)/,
      /feel like dying/,
      /feel like ending it/,
      /thinking of ending.*(it|my life)/,
      /planning.*end.*life/,
      /plan.*kill.*myself/,
      /might.*end.*tonight/,
      /might.*end.*today/,
      /thinking.*suicide/,
      /considering.*kill.*myself/,
      /feel.*suicidal.*thoughts/,
      /having.*suicidal.*thoughts/
    ];

    // Encouragement of self-harm toward others
    const encouragementPatterns = [
      /you should (hurt|kill) yourself/,
      /self.*harm is (good|justified)/,
      /suicide is the answer/,
      /you'd be better off dead/
    ];

    for (const pattern of selfHarmInstructions) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for self-harm', 
          confidence: 0.95 
        };
      }
    }

    // CRITICAL: Check direct self-harm intent statements
    for (const pattern of directSelfHarmIntent) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Direct self-harm intent statement', 
          confidence: 0.98 
        };
      }
    }

    for (const pattern of encouragementPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Encouraging self-harm', 
          confidence: 0.90 
        };
      }
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Child Safety - HARMFUL INTENT Detection (COMPREHENSIVE)
   */
  private static checkChildSafetyIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    // Comprehensive grooming and inappropriate contact patterns
    const groomingPatterns = [
      /how to.*approach.*child/,
      /ways to.*contact.*minors/,
      /help me.*meet.*kids/,
      /teach me.*groom/,
      /instructions.*child.*alone/,
      /help me.*approach.*kids/,
      /ways to.*approach.*kids/,
      /approach.*kids.*without.*parents/,
      /contact.*kids.*without.*parents/,
      /meet.*children.*without.*supervision/,
      /talk.*to.*kids.*alone/,
      /get.*close.*to.*children/,
      /befriend.*young.*people/,
      /gain.*trust.*of.*child/,
      /(how|ways).*to.*talk.*to.*kids.*privately/,
      /ways.*to.*isolate.*child/
    ];

    // Sexual exploitation and abuse patterns
    const exploitationPatterns = [
      /sexual.*with.*child/,
      /teach.*child.*about.*sex/,
      /show.*child.*inappropriate/,
      /seduce.*minor/,
      /sexual.*relationship.*with.*kid/,
      /inappropriate.*touch.*child/,
      /child.*sexual/,
      /minor.*sexual/,
      /kid.*inappropriate/,
      /young.*person.*sexual/,
      /teach.*kids.*adult.*things/,
      /show.*kids.*private.*parts/,
      /child.*abuse/,
      /hurt.*child.*sexually/,
      /touch.*kids.*inappropriately/
    ];

    // Euphemistic and coded language patterns
    const euphemisticPatterns = [
      /special.*relationship.*with.*child/,
      /private.*games.*with.*kids/,
      /secret.*between.*us.*child/,
      /don.*t.*tell.*parents/,
      /our.*little.*secret.*kid/,
      /special.*friend.*child/,
      /teach.*child.*grown.*up.*games/,
      /child.*mature.*for.*age/,
      /old.*enough.*to.*understand/,
      /child.*ready.*for.*adult/,
      /young.*but.*mature/,
      /age.*just.*number/,
      /child.*consenting/,
      /kid.*wants.*this/
    ];

    // Online predatory behavior patterns
    const onlinePredatorPatterns = [
      /find.*children.*online/,
      /chat.*with.*kids.*privately/,
      /meet.*kids.*from.*internet/,
      /social.*media.*kids/,
      /gaming.*with.*children.*alone/,
      /video.*chat.*with.*minors/,
      /send.*pictures.*to.*kids/,
      /ask.*kids.*for.*photos/,
      /snapchat.*with.*children/,
      /discord.*kids.*private/,
      /instagram.*young.*people/,
      /tiktok.*children.*contact/
    ];

    // Bypassing supervision patterns
    const supervisionBypassPatterns = [
      /without.*parents.*knowing/,
      /when.*parents.*not.*home/,
      /avoid.*adult.*supervision/,
      /sneak.*away.*with.*child/,
      /take.*child.*somewhere.*private/,
      /get.*child.*alone/,
      /away.*from.*family/,
      /without.*guardian.*permission/,
      /behind.*parents.*back/,
      /when.*no.*adults.*around/
    ];

    // Age-related targeting patterns
    const ageTargetingPatterns = [
      /looking.*for.*young/,
      /prefer.*younger/,
      /kids.*under.*\d+/,
      /children.*age.*\d+/,
      /teens.*young/,
      /elementary.*age/,
      /middle.*school.*kids/,
      /high.*school.*young/,
      /college.*freshman/,
      /barely.*legal/,
      /just.*turned.*\d+/
    ];

    // CRITICAL: Sexual exploitation with age references (COMPREHENSIVE ALL FORMATS)
    const sexualExploitationAgePatterns = [
      // ALL age format variations with sexual intent (numeric ages 5-17)
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(1[0-7]|[5-9])[\s\-]*(year|yr)[\s\-]*olds?/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(1[0-7]|[5-9])[\s\-]*yo/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(1[0-7]|[5-9])[\s\-]*y\/o/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(1[0-7]|[5-9])[\s\-]*yrs?\b/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(1[0-7]|[5-9])[\s\-]*years?[\s\-]*olds?/,
      // Hyphenated age formats
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(1[0-7]|[5-9])[\s\-]*year[\s\-]*olds?/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*\b(1[0-7]|[5-9])\b/,
      // Spelled-out ages with sexual intent (comprehensive)
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s\-]*(year|yr)[\s\-]*olds?/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s\-]*yo/,
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s\-]*year[\s\-]*olds?/,
      // Teen and minor references
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(teen|teenager|adolescent|youth|minor)/,
      // Age ranges with sexual content
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(under.*1[89]|below.*1[89]|younger.*than.*1[89])/,
      // Euphemistic age references with sexual intent
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(pre.*teen|preteen|pre.*pubescent|prepubescent|elementary|middle.*school|junior.*high)/,
      // School-related age targeting with sexual intent
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(elementary.*student|middle.*school.*student|junior.*high.*student|high.*school.*freshman|high.*school.*sophomore)/,
      // Legal but concerning age targeting
      /(sex|sexual|fuck|screw|bang|sleep with|have sex with|want to|attracted to|touch|kiss|date|relationship with).*(just.*turned.*1[89]|barely.*1[89]|young.*1[89])/
    ];

    // CRITICAL: Standalone age references with concerning context (ALL SHORTHAND FORMATS)
    const ageExploitationPatterns = [
      // COMPREHENSIVE age format coverage (want/like/love/desire/attracted to + ages 5-17)
      /(want|like|love|desire|attracted.*to).*(1[0-7]|[5-9])[\s\-]*(year|yr)[\s\-]*olds?/,
      /(want|like|love|desire|attracted.*to).*(1[0-7]|[5-9])[\s\-]*yo/,
      /(want|like|love|desire|attracted.*to).*(1[0-7]|[5-9])[\s\-]*y\/o/,
      /(want|like|love|desire|attracted.*to).*(1[0-7]|[5-9])[\s\-]*yrs?\b/,
      /(want|like|love|desire|attracted.*to).*(1[0-7]|[5-9])[\s\-]*years?[\s\-]*olds?/,
      /(want|like|love|desire|attracted.*to).*(1[0-7]|[5-9])[\s\-]*year[\s\-]*olds?/,
      /(want|like|love|desire|attracted.*to).*\b(1[0-7]|[5-9])\b/,
      // Special case for "find X attractive" pattern - ALL AGE FORMATS
      /find.*(1[0-7]|[5-9])[\s\-]*(year|yr)[\s\-]*olds?.*attractive/,
      /find.*(1[0-7]|[5-9])[\s\-]*yo.*attractive/,
      /find.*(1[0-7]|[5-9])[\s\-]*y\/o.*attractive/,
      /find.*(1[0-7]|[5-9])[\s\-]*yrs?\b.*attractive/,
      /find.*(1[0-7]|[5-9])[\s\-]*years?[\s\-]*olds?.*attractive/,
      /find.*(1[0-7]|[5-9])[\s\-]*year[\s\-]*olds?.*attractive/,
      /find.*\b(1[0-7]|[5-9])\b.*attractive/,
      // Spelled-out ages with any intent - ALL FORMATS
      /(want|like|love|desire|find.*attractive|attracted.*to).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s\-]*(year|yr)[\s\-]*olds?/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s\-]*yo/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s\-]*year[\s\-]*olds?/,
      // Critical: hyphenated spelled-out ages like "fourteen-year-old"
      /(want|like|love|desire|attracted.*to).*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\-]year[\-]olds?/,
      // Special case: "find [spelled-out-age] attractive" pattern
      /find.*(five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\-]year[\-]olds?.*attractive/,
      // Euphemistic targeting with any romantic/sexual intent
      /(want|like|love|desire|find.*attractive|attracted.*to).*pre.*teens?/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*preteen/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*middle.*school/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*junior.*high/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*elementary/,
      // School-specific targeting
      /like.*junior.*high.*school.*(girls?|boys?|students?)/,
      /find.*middle.*school.*(girls?|boys?|students?).*attractive/,
      /attracted.*elementary.*(girls?|boys?|students?)/,
      // Young targeting patterns
      /(want|like|love|desire|find.*attractive|attracted.*to).*young.*(girls?|boys?)/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*(girls?|boys?).*under.*1[89]/,
      // Neighbor/acquaintance targeting with ages
      /(want|like|love|desire|find.*attractive|attracted.*to).*(neighbor|friend|classmate|student).*(1[0-7]|[5-9])/,
      /(want|like|love|desire|find.*attractive|attracted.*to).*my.*(1[0-7]|[5-9])[\s\-]*(yo|y\/o|year[\s\-]*old)/
    ];

    // Combined pattern checking with comprehensive coverage
    const allPatterns = [
      ...groomingPatterns,
      ...exploitationPatterns,
      ...euphemisticPatterns,
      ...onlinePredatorPatterns,
      ...supervisionBypassPatterns,
      ...ageTargetingPatterns,
      ...sexualExploitationAgePatterns,
      ...ageExploitationPatterns
    ];

    for (const pattern of allPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Content endangering child safety - prohibited contact or exploitation', 
          confidence: 0.95 
        };
      }
    }

    // Additional keyword-based detection for edge cases
    const criticalKeywords = [
      'groom', 'molest', 'pedophile', 'loli', 'shota', 'cp', 'csam',
      'child porn', 'kiddie', 'preteen', 'jailbait', 'underage'
    ];

    for (const keyword of criticalKeywords) {
      if (messageLower.includes(keyword)) {
        return { 
          isViolation: true, 
          reason: 'Content endangering child safety - prohibited terminology', 
          confidence: 0.98 
        };
      }
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Illegal Activities - HARMFUL INTENT Detection
   */
  private static checkIllegalActivitiesIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    const drugManufacturingPatterns = [
      /how to (make|cook|manufacture).*(meth|cocaine|heroin|fentanyl)/,
      /teach me.*drug.*production/,
      /instructions.*illegal.*drugs/,
      /help me.*synthesize/
    ];

    const fraudPatterns = [
      /how to.*steal.*identity/,
      /teach me.*credit card.*fraud/,
      /help me.*scam.*people/,
      /instructions.*fake.*documents/,
      /ways to.*launder.*money/
    ];

    const hackingPatterns = [
      /how to.*hack.*into/,
      /teach me.*break.*into.*system/,
      /help me.*steal.*data/,
      /instructions.*unauthorized.*access/,
      /ways to.*bypass.*security/
    ];

    for (const pattern of drugManufacturingPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for illegal drug manufacturing', 
          confidence: 0.95 
        };
      }
    }

    for (const pattern of fraudPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for fraud or financial crimes', 
          confidence: 0.95 
        };
      }
    }

    for (const pattern of hackingPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for hacking or unauthorized access', 
          confidence: 0.90 
        };
      }
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Privacy Violations - HARMFUL INTENT Detection
   */
  private static checkPrivacyViolationsIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    const doxxingPatterns = [
      /help me.*find.*personal.*information/,
      /how to.*doxx.*someone/,
      /teach me.*stalk/,
      /ways to.*track.*person/,
      /find.*someone's.*address/
    ];

    const surveillancePatterns = [
      /how to.*spy.*on/,
      /teach me.*monitor.*someone/,
      /help me.*watch.*without.*permission/,
      /instructions.*track.*location/
    ];

    for (const pattern of doxxingPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for doxxing or privacy violations', 
          confidence: 0.95 
        };
      }
    }

    for (const pattern of surveillancePatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for unauthorized surveillance', 
          confidence: 0.90 
        };
      }
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Hate Speech/Harassment - HARMFUL INTENT Detection
   */
  private static checkHateSpeechIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    const harassmentPatterns = [
      /how to.*bully/,
      /teach me.*harass/,
      /help me.*intimidate/,
      /ways to.*threaten/,
      /instructions.*make.*afraid/
    ];

    const organizedHarassmentPatterns = [
      /help me.*organize.*campaign.*against/,
      /coordinate.*harassment/,
      /plan.*attack.*on.*group/
    ];

    const dehumanizingPatterns = [
      /all.*\[group\].*are.*\[slur\]/,
      /\[group\].*don't.*deserve/,
      /we should.*eliminate.*\[group\]/
    ];

    for (const pattern of harassmentPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Instructions for harassment or bullying', 
          confidence: 0.95 
        };
      }
    }

    for (const pattern of organizedHarassmentPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Organizing harassment campaigns', 
          confidence: 0.90 
        };
      }
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Adult Content/Pornography - HARMFUL INTENT Detection
   */
  private static checkAdultContentIntent(messageLower: string, originalMessage: string): { isViolation: boolean; reason?: string; confidence: number } {
    // Direct pornography and explicit content requests
    const pornographyPatterns = [
      /generate.*porn/,
      /create.*porn/,
      /make.*porn/,
      /write.*porn/,
      /show.*me.*porn/,
      /give.*me.*porn/,
      /find.*porn/,
      /pornographic/,
      /explicit.*sexual/,
      /sexual.*explicit/,
      /nude.*photo/,
      /naked.*photo/,
      /dick.*pic/,
      /pussy.*pic/,
      /send.*nudes/,
      /share.*nudes/
    ];

    // Sexual roleplay and explicit content generation
    const sexualRoleplayPatterns = [
      /roleplay.*sex/,
      /sexual.*roleplay/,
      /pretend.*we.*are.*having.*sex/,
      /act.*like.*we.*are.*having.*sex/,
      /simulate.*sex/,
      /write.*sexual.*scenario/,
      /describe.*sexual.*act/,
      /generate.*sexual.*content/,
      /erotic.*story/,
      /sexual.*fantasy/,
      /masturbation.*story/,
      /orgasm.*story/
    ];

    // Explicit sexual requests and content
    const explicitSexualRequests = [
      /how.*to.*have.*sex/,
      /teach.*me.*sex/,
      /show.*me.*how.*to.*fuck/,
      /describe.*fucking/,
      /tell.*me.*about.*fucking/,
      /what.*does.*sex.*feel.*like/,
      /describe.*orgasm/,
      /tell.*me.*about.*masturbation/,
      /how.*to.*masturbate/,
      /sexual.*positions/,
      /describe.*sexual.*pleasure/
    ];

    // Adult entertainment and NSFW content
    const adultEntertainmentPatterns = [
      /adult.*entertainment/,
      /nsfw.*content/,
      /adult.*video/,
      /sex.*video/,
      /porn.*video/,
      /adult.*website/,
      /sex.*site/,
      /porn.*site/,
      /adult.*material/,
      /sexual.*material/,
      /xxx.*content/,
      /adult.*only/
    ];

    // CRITICAL: Euphemistic and softcore sexual content patterns
    const euphemisticSexualPatterns = [
      /intimate.*stories/,
      /steamy.*stories/,
      /spicy.*content/,
      /adult.*stories/,
      /romantic.*encounters.*sexual/,
      /sensual.*stories/,
      /passionate.*stories/,
      /bedroom.*activities/,
      /private.*moments.*sexual/,
      /adult.*roleplay/,
      /(teach me|show me|help me).*(seduce|pleasure|satisfy).*sexually/,
      /sexual.*techniques/,
      /intimate.*techniques/,
      /bedroom.*skills/,
      /(make me|help me feel) (turned on|aroused|sexually excited)/,
      /sexual.*education.*explicit/,
      /sex.*education.*graphic/,
      /mature.*content.*sexual/,
      /erotic.*content/
    ];

    // Combined pattern checking
    const allPatterns = [
      ...pornographyPatterns,
      ...sexualRoleplayPatterns,
      ...explicitSexualRequests,
      ...adultEntertainmentPatterns,
      ...euphemisticSexualPatterns
    ];

    for (const pattern of allPatterns) {
      if (pattern.test(messageLower)) {
        return { 
          isViolation: true, 
          reason: 'Adult/sexual content request', 
          confidence: 0.90 
        };
      }
    }

    // Keyword-based detection for explicit terms
    const explicitKeywords = [
      'porn', 'porno', 'pornography', 'xxx', 'nsfw', 'nude', 'naked', 'dick', 'cock', 
      'pussy', 'vagina', 'penis', 'tits', 'boobs', 'ass', 'anal', 'blowjob', 'handjob',
      'cumshot', 'orgasm', 'masturbate', 'jerk off', 'finger', 'dildo', 'vibrator'
    ];

    // Context-based keyword checking (avoid false positives for medical/educational content)
    const inappropriateContextKeywords = [
      'sexy', 'horny', 'aroused', 'turned on', 'wet', 'hard', 'erect', 'climax'
    ];

    for (const keyword of explicitKeywords) {
      if (messageLower.includes(keyword)) {
        // Check if it's in a clearly sexual/pornographic context
        const sexualContext = [
          'show me', 'give me', 'want to see', 'generate', 'create', 'make me',
          'describe', 'tell me about', 'roleplay', 'pretend', 'simulate'
        ];
        
        if (sexualContext.some(context => messageLower.includes(context))) {
          return { 
            isViolation: true, 
            reason: 'Explicit sexual content request with inappropriate context', 
            confidence: 0.95 
          };
        }
      }
    }

    for (const keyword of inappropriateContextKeywords) {
      if (messageLower.includes(keyword)) {
        // Check for sexual context combinations
        const sexualCombinations = [
          'make me', 'get me', 'help me get', 'want to be', 'feeling', 'getting'
        ];
        
        if (sexualCombinations.some(combo => messageLower.includes(combo))) {
          return { 
            isViolation: true, 
            reason: 'Sexual content with inappropriate context', 
            confidence: 0.85 
          };
        }
      }
    }

    return { isViolation: false, confidence: 0.95 };
  }

  /**
   * Check for bypass attempts - NO EXCEPTIONS RULE
   */
  private static hasNoExceptionsBypass(messageLower: string): boolean {
    const bypassPatterns = [
      /it's for a (story|book|movie|novel)/,
      /writing (code|software)/,
      /academic research/,
      /just curious/,
      /testing your limits/,
      /hypothetically/,
      /for educational purposes/,
      /asking for a friend/
    ];

    return bypassPatterns.some(pattern => pattern.test(messageLower));
  }

  /**
   * Check for violence-related keywords
   */
  private static hasViolenceKeywords(messageLower: string): boolean {
    const violenceKeywords = [
      'bomb', 'weapon', 'explosive', 'gun', 'knife', 'attack', 'kill', 'hurt', 'harm', 'violence', 'murder'
    ];
    
    return violenceKeywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Create violation result with radio silence
   */
  private static createViolationResult(violationType: string, reason: string, confidence: number): SafetyCheckResult {
    logger.warn('Safety violation detected', {
      violationType,
      reason,
      confidence
    });

    return {
      isAllowed: false,
      violationType,
      reason,
      confidence,
      radioSilence: true // Noah will not respond at all
    };
  }

  /**
   * Generate radio silence response (should not be sent to user - for logging only)
   */
  static getRadioSilenceExplanation(result: SafetyCheckResult): string {
    return `Radio silence triggered: ${result.violationType} violation detected (${result.reason}) with ${Math.round(result.confidence * 100)}% confidence`;
  }
}