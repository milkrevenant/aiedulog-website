/**
 * Comprehensive Input Sanitization System
 * 
 * FIXES: CRITICAL-03 - Missing Input Sanitization (CVSS 8.7)
 * 
 * SECURITY FEATURES:
 * - XSS prevention through HTML entity encoding
 * - SQL injection prevention through pattern detection
 * - NoSQL injection prevention
 * - Command injection prevention
 * - LDAP injection prevention
 * - Path traversal prevention
 * - Script injection prevention
 * - Comprehensive input validation
 * - Whitelist-based sanitization
 * - Content Security Policy safe output
 * 
 * ADDRESSES VULNERABILITIES:
 * - Direct user input to database without sanitization
 * - Missing XSS protection in user-generated content
 * - Insufficient input validation on API endpoints
 * - Potential code injection through user inputs
 */

export interface SanitizationOptions {
  allowHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
  stripWhitespace?: boolean;
  preserveNewlines?: boolean;
  enableLogging?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  originalValue: string;
  appliedSanitizations: string[];
  warnings: string[];
  errors: string[];
}

export interface SanitizationReport {
  totalInputs: number;
  sanitizedInputs: number;
  blockedInputs: number;
  patterns: {
    xssAttempts: number;
    sqlInjectionAttempts: number;
    commandInjectionAttempts: number;
    pathTraversalAttempts: number;
  };
}

/**
 * Comprehensive Input Sanitizer - CRITICAL SECURITY COMPONENT
 * 
 * 🔒 SECURITY CRITICAL: This class prevents multiple types of injection attacks
 * by sanitizing all user inputs before they reach the database or are displayed.
 */
export class InputSanitizer {
  private static readonly MAX_STRING_LENGTH = 50000; // Prevent DoS through large inputs
  private static readonly MAX_FIELD_COUNT = 100; // Prevent object pollution
  
  // 🔒 SECURITY PATTERNS: Detection of malicious input patterns
  private static readonly SECURITY_PATTERNS = {
    // SQL Injection patterns
    SQL_INJECTION: [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b|\bEXEC\b|\bEVAL\b)/gi,
      /(\bOR\s+\d+\s*=\s*\d+|\bAND\s+\d+\s*=\s*\d+)/gi,
      /(;|--|\/\*|\*\/|xp_|sp_)/gi,
      /(\bunion\s+select|\bunion\s+all\s+select)/gi,
      /(information_schema|sysobjects|syscolumns)/gi,
      /(\|\||&&|\bCONCAT\b)/gi
    ],
    
    // XSS patterns
    XSS: [
      /<[^>]*script[^>]*>/gi,
      /<[^>]*javascript:[^>]*>/gi,
      /<[^>]*on\w+\s*=\s*[^>]*>/gi,
      /<[^>]*style\s*=\s*[^>]*expression\s*\([^>]*\)/gi,
      /<[^>]*style\s*=\s*[^>]*@import[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi
    ],
    
    // Command Injection patterns
    COMMAND_INJECTION: [
      /(\||&|;|\$\(|\`|<|>)/g,
      /(\bcat\b|\bls\b|\bpwd\b|\bwhoami\b|\bps\b)/gi,
      /(\brm\b|\bmv\b|\bcp\b|\bchmod\b|\bchown\b)/gi,
      /(\bcurl\b|\bwget\b|\bnc\b|\btelnet\b)/gi,
      /(\beval\b|\bexec\b|\bsystem\b)/gi
    ],
    
    // Path Traversal patterns
    PATH_TRAVERSAL: [
      /\.\.\//g,
      /\.\.\\|\.\.\%2f|\.\.\%5c/gi,
      /%2e%2e%2f|%2e%2e\\/gi,
      /\0/g,
      /(\/etc\/|\/proc\/|\/sys\/)/gi
    ],
    
    // NoSQL Injection patterns
    NOSQL_INJECTION: [
      /\$where|\$regex|\$ne|\$gt|\$lt/gi,
      /\{\s*\$.*?\}/g,
      /db\.|collection\./gi
    ],
    
    // LDAP Injection patterns
    LDAP_INJECTION: [
      /\(|\)|&|\||=|\*|!/g,
      /\x00|\x01|\x02|\x03|\x04/g
    ]
  };

  // 🔒 SECURITY: Allowed HTML tags for rich text (very restrictive)
  private static readonly ALLOWED_HTML_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ];

  private static readonly ALLOWED_HTML_ATTRIBUTES = [
    'class', 'id'
  ];

  private static reports: SanitizationReport = {
    totalInputs: 0,
    sanitizedInputs: 0,
    blockedInputs: 0,
    patterns: {
      xssAttempts: 0,
      sqlInjectionAttempts: 0,
      commandInjectionAttempts: 0,
      pathTraversalAttempts: 0
    }
  };

  /**
   * 🔒 MAIN SANITIZATION FUNCTION: Sanitize string input with comprehensive protection
   */
  static sanitizeString(
    input: unknown, 
    options: SanitizationOptions = {}
  ): ValidationResult {
    const {
      allowHtml = false,
      allowedTags = this.ALLOWED_HTML_TAGS,
      allowedAttributes = this.ALLOWED_HTML_ATTRIBUTES,
      maxLength = this.MAX_STRING_LENGTH,
      stripWhitespace = false,
      preserveNewlines = true,
      enableLogging = true
    } = options;

    const appliedSanitizations: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    this.reports.totalInputs++;

    // Type validation
    if (input === null || input === undefined) {
      return {
        isValid: true,
        sanitizedValue: '',
        originalValue: String(input),
        appliedSanitizations: ['null_conversion'],
        warnings: [],
        errors: []
      };
    }

    if (typeof input !== 'string') {
      input = String(input);
      appliedSanitizations.push('type_conversion');
    }

    let sanitized = input as string;
    const originalValue = sanitized;

    // Length validation
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      appliedSanitizations.push('length_truncation');
      warnings.push(`Input truncated from ${originalValue.length} to ${maxLength} characters`);
    }

    // 🔒 SECURITY CHECK 1: SQL Injection Prevention
    const sqlDetection = this.detectSQLInjection(sanitized);
    if (sqlDetection.detected) {
      this.reports.patterns.sqlInjectionAttempts++;
      sqlDetection.patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern.regex, '');
        appliedSanitizations.push('sql_injection_removal');
        warnings.push(`Removed SQL injection pattern: ${pattern.name}`);
      });
    }

    // 🔒 SECURITY CHECK 2: XSS Prevention
    if (!allowHtml) {
      const xssDetection = this.detectXSS(sanitized);
      if (xssDetection.detected) {
        this.reports.patterns.xssAttempts++;
        sanitized = this.escapeHtml(sanitized);
        appliedSanitizations.push('xss_html_escape');
        warnings.push('HTML entities escaped to prevent XSS');
      }
    } else {
      // Allow only specific HTML tags
      sanitized = this.sanitizeHtml(sanitized, allowedTags, allowedAttributes);
      appliedSanitizations.push('html_tag_filtering');
    }

    // 🔒 SECURITY CHECK 3: Command Injection Prevention
    const commandDetection = this.detectCommandInjection(sanitized);
    if (commandDetection.detected) {
      this.reports.patterns.commandInjectionAttempts++;
      commandDetection.patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern.regex, '');
        appliedSanitizations.push('command_injection_removal');
        warnings.push(`Removed command injection pattern: ${pattern.name}`);
      });
    }

    // 🔒 SECURITY CHECK 4: Path Traversal Prevention
    const pathDetection = this.detectPathTraversal(sanitized);
    if (pathDetection.detected) {
      this.reports.patterns.pathTraversalAttempts++;
      pathDetection.patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern.regex, '');
        appliedSanitizations.push('path_traversal_removal');
        warnings.push(`Removed path traversal pattern: ${pattern.name}`);
      });
    }

    // 🔒 SECURITY CHECK 5: NoSQL Injection Prevention
    const nosqlDetection = this.detectNoSQLInjection(sanitized);
    if (nosqlDetection.detected) {
      nosqlDetection.patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern.regex, '');
        appliedSanitizations.push('nosql_injection_removal');
        warnings.push(`Removed NoSQL injection pattern: ${pattern.name}`);
      });
    }

    // 🔒 SECURITY CHECK 6: LDAP Injection Prevention
    const ldapDetection = this.detectLDAPInjection(sanitized);
    if (ldapDetection.detected) {
      ldapDetection.patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern.regex, '');
        appliedSanitizations.push('ldap_injection_removal');
        warnings.push(`Removed LDAP injection pattern: ${pattern.name}`);
      });
    }

    // Additional sanitization
    if (stripWhitespace) {
      sanitized = sanitized.trim();
      appliedSanitizations.push('whitespace_trimming');
    }

    if (!preserveNewlines) {
      sanitized = sanitized.replace(/\r?\n|\r/g, ' ');
      appliedSanitizations.push('newline_removal');
    }

    // Control character removal
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (sanitized !== originalValue) {
      appliedSanitizations.push('control_character_removal');
    }

    // Update statistics
    if (appliedSanitizations.length > 0) {
      this.reports.sanitizedInputs++;
    }

    // Logging for security monitoring
    if (enableLogging && (warnings.length > 0 || errors.length > 0)) {
      console.warn('Input sanitization applied:', {
        original: originalValue.substring(0, 100),
        sanitized: sanitized.substring(0, 100),
        appliedSanitizations,
        warnings,
        errors
      });
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      originalValue,
      appliedSanitizations,
      warnings,
      errors
    };
  }

  /**
   * 🔒 OBJECT SANITIZATION: Recursively sanitize object properties
   */
  static sanitizeObject(
    obj: unknown, 
    options: SanitizationOptions = {}
  ): { sanitized: any; report: ValidationResult } {
    if (obj === null || obj === undefined) {
      return {
        sanitized: obj,
        report: {
          isValid: true,
          sanitizedValue: String(obj),
          originalValue: String(obj),
          appliedSanitizations: [],
          warnings: [],
          errors: []
        }
      };
    }

    if (typeof obj === 'string') {
      const result = this.sanitizeString(obj, options);
      return {
        sanitized: result.sanitizedValue,
        report: result
      };
    }

    if (Array.isArray(obj)) {
      const sanitizedArray: any[] = [];
      const reports: ValidationResult[] = [];
      
      obj.forEach((item, index) => {
        if (index >= this.MAX_FIELD_COUNT) {
          reports.push({
            isValid: false,
            sanitizedValue: '',
            originalValue: String(item),
            appliedSanitizations: ['array_truncation'],
            warnings: [`Array truncated at index ${this.MAX_FIELD_COUNT}`],
            errors: []
          });
          return;
        }
        
        const result = this.sanitizeObject(item, options);
        sanitizedArray.push(result.sanitized);
        reports.push(result.report);
      });

      return {
        sanitized: sanitizedArray,
        report: this.mergeValidationResults(reports)
      };
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      const reports: ValidationResult[] = [];
      let fieldCount = 0;

      for (const [key, value] of Object.entries(obj)) {
        if (fieldCount >= this.MAX_FIELD_COUNT) {
          reports.push({
            isValid: false,
            sanitizedValue: '',
            originalValue: String(value),
            appliedSanitizations: ['object_field_limit'],
            warnings: [`Object field limit reached at ${this.MAX_FIELD_COUNT} fields`],
            errors: []
          });
          break;
        }

        // Sanitize the key
        const keyResult = this.sanitizeString(key, { ...options, maxLength: 100 });
        const cleanKey = keyResult.sanitizedValue;
        
        // Sanitize the value
        const valueResult = this.sanitizeObject(value, options);
        
        sanitized[cleanKey] = valueResult.sanitized;
        reports.push(keyResult);
        reports.push(valueResult.report);
        
        fieldCount++;
      }

      return {
        sanitized,
        report: this.mergeValidationResults(reports)
      };
    }

    // Primitive types (number, boolean, etc.)
    return {
      sanitized: obj,
      report: {
        isValid: true,
        sanitizedValue: String(obj),
        originalValue: String(obj),
        appliedSanitizations: [],
        warnings: [],
        errors: []
      }
    };
  }

  /**
   * 🔒 SQL INJECTION DETECTION
   */
  private static detectSQLInjection(input: string): {
    detected: boolean;
    patterns: Array<{ name: string; regex: RegExp }>;
  } {
    const detectedPatterns: Array<{ name: string; regex: RegExp }> = [];
    
    this.SECURITY_PATTERNS.SQL_INJECTION.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detectedPatterns.push({
          name: `SQL_INJECTION_${index + 1}`,
          regex: pattern
        });
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * 🔒 XSS DETECTION
   */
  private static detectXSS(input: string): {
    detected: boolean;
    patterns: Array<{ name: string; regex: RegExp }>;
  } {
    const detectedPatterns: Array<{ name: string; regex: RegExp }> = [];
    
    this.SECURITY_PATTERNS.XSS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detectedPatterns.push({
          name: `XSS_${index + 1}`,
          regex: pattern
        });
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * 🔒 COMMAND INJECTION DETECTION
   */
  private static detectCommandInjection(input: string): {
    detected: boolean;
    patterns: Array<{ name: string; regex: RegExp }>;
  } {
    const detectedPatterns: Array<{ name: string; regex: RegExp }> = [];
    
    this.SECURITY_PATTERNS.COMMAND_INJECTION.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detectedPatterns.push({
          name: `COMMAND_INJECTION_${index + 1}`,
          regex: pattern
        });
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * 🔒 PATH TRAVERSAL DETECTION
   */
  private static detectPathTraversal(input: string): {
    detected: boolean;
    patterns: Array<{ name: string; regex: RegExp }>;
  } {
    const detectedPatterns: Array<{ name: string; regex: RegExp }> = [];
    
    this.SECURITY_PATTERNS.PATH_TRAVERSAL.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detectedPatterns.push({
          name: `PATH_TRAVERSAL_${index + 1}`,
          regex: pattern
        });
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * 🔒 NOSQL INJECTION DETECTION
   */
  private static detectNoSQLInjection(input: string): {
    detected: boolean;
    patterns: Array<{ name: string; regex: RegExp }>;
  } {
    const detectedPatterns: Array<{ name: string; regex: RegExp }> = [];
    
    this.SECURITY_PATTERNS.NOSQL_INJECTION.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detectedPatterns.push({
          name: `NOSQL_INJECTION_${index + 1}`,
          regex: pattern
        });
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * 🔒 LDAP INJECTION DETECTION
   */
  private static detectLDAPInjection(input: string): {
    detected: boolean;
    patterns: Array<{ name: string; regex: RegExp }>;
  } {
    const detectedPatterns: Array<{ name: string; regex: RegExp }> = [];
    
    this.SECURITY_PATTERNS.LDAP_INJECTION.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detectedPatterns.push({
          name: `LDAP_INJECTION_${index + 1}`,
          regex: pattern
        });
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * 🔒 HTML ESCAPE: Prevent XSS through HTML entity encoding
   */
  private static escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 🔒 HTML SANITIZATION: Allow only specific tags and attributes
   */
  private static sanitizeHtml(
    input: string, 
    allowedTags: string[], 
    allowedAttributes: string[]
  ): string {
    // Simple HTML sanitization - in production, use a library like DOMPurify
    let sanitized = input;
    
    // Remove all tags except allowed ones
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    sanitized = sanitized.replace(tagPattern, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        // Keep allowed tags but sanitize attributes
        return this.sanitizeAttributes(match, allowedAttributes);
      }
      return ''; // Remove disallowed tags
    });
    
    return sanitized;
  }

  /**
   * 🔒 ATTRIBUTE SANITIZATION: Remove dangerous attributes
   */
  private static sanitizeAttributes(tag: string, allowedAttributes: string[]): string {
    // Simple attribute sanitization
    return tag.replace(/\s+(\w+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (match, attrName) => {
      if (allowedAttributes.includes(attrName.toLowerCase())) {
        return match;
      }
      return '';
    });
  }

  /**
   * Merge multiple validation results
   */
  private static mergeValidationResults(results: ValidationResult[]): ValidationResult {
    const allSanitizations: string[] = [];
    const allWarnings: string[] = [];
    const allErrors: string[] = [];
    let isValid = true;

    results.forEach(result => {
      allSanitizations.push(...result.appliedSanitizations);
      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
      if (!result.isValid) {
        isValid = false;
      }
    });

    return {
      isValid,
      sanitizedValue: 'object',
      originalValue: 'object',
      appliedSanitizations: [...new Set(allSanitizations)],
      warnings: [...new Set(allWarnings)],
      errors: [...new Set(allErrors)]
    };
  }

  /**
   * Get sanitization statistics
   */
  static getSanitizationReport(): SanitizationReport {
    return { ...this.reports };
  }

  /**
   * Reset sanitization statistics
   */
  static resetStatistics(): void {
    this.reports = {
      totalInputs: 0,
      sanitizedInputs: 0,
      blockedInputs: 0,
      patterns: {
        xssAttempts: 0,
        sqlInjectionAttempts: 0,
        commandInjectionAttempts: 0,
        pathTraversalAttempts: 0
      }
    };
  }

  /**
   * 🔒 SPECIFIC SANITIZERS for common use cases
   */
  static sanitizeEmail(email: unknown): ValidationResult {
    const result = this.sanitizeString(email, { 
      maxLength: 254,
      stripWhitespace: true 
    });
    
    if (result.sanitizedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.sanitizedValue)) {
      result.errors.push('Invalid email format');
      result.isValid = false;
    }
    
    return result;
  }

  static sanitizePhoneNumber(phone: unknown): ValidationResult {
    const result = this.sanitizeString(phone, { 
      maxLength: 20,
      stripWhitespace: true 
    });
    
    // Keep only digits, +, -, (, ), spaces
    result.sanitizedValue = result.sanitizedValue.replace(/[^0-9+\-() ]/g, '');
    
    if (result.sanitizedValue !== result.originalValue) {
      result.appliedSanitizations.push('phone_character_filtering');
    }
    
    return result;
  }

  static sanitizeUrl(url: unknown): ValidationResult {
    const result = this.sanitizeString(url, { 
      maxLength: 2048,
      stripWhitespace: true 
    });
    
    // Check for safe protocols
    if (result.sanitizedValue && !result.sanitizedValue.match(/^https?:\/\//i)) {
      result.warnings.push('URL should start with http:// or https://');
    }
    
    return result;
  }

  static sanitizeName(name: unknown): ValidationResult {
    return this.sanitizeString(name, {
      maxLength: 100,
      stripWhitespace: true,
      preserveNewlines: false
    });
  }

  static sanitizeDescription(description: unknown): ValidationResult {
    return this.sanitizeString(description, {
      maxLength: 2000,
      stripWhitespace: true,
      preserveNewlines: true,
      allowHtml: false
    });
  }
}

// Export additional utilities
export { InputSanitizer as default };

/**
 * Quick sanitization functions for common cases
 */
export const sanitize = {
  string: (input: unknown) => InputSanitizer.sanitizeString(input).sanitizedValue,
  object: (input: unknown) => InputSanitizer.sanitizeObject(input).sanitized,
  email: (input: unknown) => InputSanitizer.sanitizeEmail(input).sanitizedValue,
  phone: (input: unknown) => InputSanitizer.sanitizePhoneNumber(input).sanitizedValue,
  url: (input: unknown) => InputSanitizer.sanitizeUrl(input).sanitizedValue,
  name: (input: unknown) => InputSanitizer.sanitizeName(input).sanitizedValue,
  description: (input: unknown) => InputSanitizer.sanitizeDescription(input).sanitizedValue
};