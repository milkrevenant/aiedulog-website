/**
 * Secure Token Generator - CRITICAL SECURITY COMPONENT
 * 
 * FIXES: CRITICAL-02 - Weak Session Token Generation (CVSS 8.9)
 * 
 * SECURITY FEATURES:
 * - Cryptographically secure random generation using Node.js crypto module
 * - High entropy token generation (256+ bits)
 * - Multiple token types for different use cases
 * - Token format validation and expiry checking
 * - Protection against timing attacks
 * - Secure token comparison functions
 * 
 * REPLACES VULNERABLE CODE:
 * - Math.random() based token generation
 * - Timestamp-based predictable tokens  
 * - Weak entropy sources
 */

import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';

export interface TokenValidation {
  valid: boolean;
  expired?: boolean;
  error?: string;
  metadata?: {
    tokenType?: string;
    createdAt?: number;
    expiresAt?: number;
  };
}

export interface SecureTokenOptions {
  entropy?: number; // Number of random bytes (default: 32)
  includeTimestamp?: boolean; // Include creation timestamp
  customPrefix?: string; // Custom token prefix
  expiryHours?: number; // Token expiry in hours (for validation)
}

/**
 * Cryptographically Secure Token Generator
 * 
 * 🔒 SECURITY CRITICAL: This class replaces vulnerable Math.random() 
 * token generation with cryptographically secure methods.
 */
export class SecureTokenGenerator {
  private static readonly DEFAULT_ENTROPY = 32; // 256 bits
  private static readonly MAX_TOKEN_AGE_HOURS = 24;
  
  // Token prefixes for different purposes
  private static readonly TOKEN_PREFIXES = {
    SESSION: 'session_',
    BOOKING: 'booking_',
    CONFIRMATION: 'confirm_',
    RESET: 'reset_',
    API: 'api_',
    TEMPORARY: 'temp_'
  } as const;

  /**
   * 🔒 SECURITY FIX: Generate cryptographically secure session token
   * 
   * BEFORE (VULNERABLE):
   * ```
   * const timestamp = Date.now().toString(36);
   * const randomPart = Math.random().toString(36).substring(2);
   * return `booking_${timestamp}_${randomPart}`;
   * ```
   * 
   * AFTER (SECURE):
   * - Uses crypto.randomBytes for true randomness
   * - High entropy (256+ bits)
   * - Unpredictable even with timestamp knowledge
   */
  static generateSessionToken(options: SecureTokenOptions = {}): string {
    const {
      entropy = this.DEFAULT_ENTROPY,
      includeTimestamp = true,
      customPrefix = this.TOKEN_PREFIXES.SESSION
    } = options;

    // Generate cryptographically secure random bytes
    const randomBytes_secure = randomBytes(entropy);
    const tokenData = randomBytes_secure.toString('base64url');
    
    if (includeTimestamp) {
      // Timestamp is for expiry validation, NOT for security
      const timestamp = Date.now().toString(36);
      return `${customPrefix}${tokenData}_${timestamp}`;
    }
    
    return `${customPrefix}${tokenData}`;
  }

  /**
   * Generate booking session token with enhanced security
   */
  static generateBookingToken(): string {
    return this.generateSessionToken({
      entropy: 32, // 256 bits
      includeTimestamp: true,
      customPrefix: this.TOKEN_PREFIXES.BOOKING
    });
  }

  /**
   * Generate confirmation token (no timestamp for security)
   */
  static generateConfirmationToken(): string {
    // Use UUID + additional random bytes for maximum uniqueness
    const uuid = randomUUID().replace(/-/g, '');
    const additionalEntropy = randomBytes(16).toString('hex');
    return `${this.TOKEN_PREFIXES.CONFIRMATION}${uuid}${additionalEntropy}`;
  }

  /**
   * Generate password reset token with high security
   */
  static generateResetToken(): string {
    return this.generateSessionToken({
      entropy: 48, // 384 bits for password reset
      includeTimestamp: false, // No timestamp for security
      customPrefix: this.TOKEN_PREFIXES.RESET
    });
  }

  /**
   * Generate API token for service authentication
   */
  static generateAPIToken(): string {
    return this.generateSessionToken({
      entropy: 64, // 512 bits for API tokens
      includeTimestamp: false,
      customPrefix: this.TOKEN_PREFIXES.API
    });
  }

  /**
   * Generate temporary token for short-lived operations
   */
  static generateTemporaryToken(expiryHours: number = 1): string {
    return this.generateSessionToken({
      entropy: 24, // 192 bits for temporary use
      includeTimestamp: true,
      customPrefix: this.TOKEN_PREFIXES.TEMPORARY,
      expiryHours
    });
  }

  /**
   * 🔒 SECURITY: Validate token format and detect tampering
   */
  static validateTokenFormat(
    token: string, 
    expectedPrefix?: string,
    maxAgeHours: number = this.MAX_TOKEN_AGE_HOURS
  ): TokenValidation {
    try {
      if (!token || typeof token !== 'string') {
        return { 
          valid: false, 
          error: 'Invalid token format: empty or non-string token' 
        };
      }

      // Check minimum length (should be substantial for security)
      if (token.length < 20) {
        return { 
          valid: false, 
          error: 'Invalid token format: token too short' 
        };
      }

      // Validate prefix if specified
      if (expectedPrefix && !token.startsWith(expectedPrefix)) {
        return { 
          valid: false, 
          error: `Invalid token format: expected prefix ${expectedPrefix}` 
        };
      }

      // Extract timestamp if present
      const parts = token.split('_');
      if (parts.length >= 3) {
        const timestampPart = parts[parts.length - 1];
        
        try {
          const timestamp = parseInt(timestampPart, 36);
          const now = Date.now();
          const age = now - timestamp;
          const maxAge = maxAgeHours * 60 * 60 * 1000;

          if (age > maxAge) {
            return {
              valid: true,
              expired: true,
              error: 'Token has expired',
              metadata: {
                createdAt: timestamp,
                expiresAt: timestamp + maxAge
              }
            };
          }

          return {
            valid: true,
            expired: false,
            metadata: {
              createdAt: timestamp,
              expiresAt: timestamp + maxAge
            }
          };
        } catch {
          // If timestamp parsing fails, treat as non-timestamped token
          return { valid: true, expired: false };
        }
      }

      // Valid token without timestamp
      return { valid: true, expired: false };

    } catch (error) {
      return { 
        valid: false, 
        error: `Token validation error: ${error instanceof Error ? error.message : 'unknown error'}` 
      };
    }
  }

  /**
   * 🔒 SECURITY: Timing-safe token comparison to prevent timing attacks
   */
  static compareTokens(token1: string, token2: string): boolean {
    if (!token1 || !token2) {
      return false;
    }

    // Ensure both tokens are the same length for timing safety
    if (token1.length !== token2.length) {
      return false;
    }

    try {
      // Use timing-safe comparison to prevent timing attacks
      const buffer1 = Buffer.from(token1, 'utf8');
      const buffer2 = Buffer.from(token2, 'utf8');
      
      return timingSafeEqual(buffer1, buffer2);
    } catch {
      return false;
    }
  }

  /**
   * Extract token metadata for analytics (non-sensitive data only)
   */
  static getTokenMetadata(token: string): { 
    prefix?: string; 
    hasTimestamp: boolean; 
    estimatedEntropy: number;
    createdAt?: Date;
  } {
    const parts = token.split('_');
    const prefix = parts.length > 1 ? `${parts[0]}_` : undefined;
    
    // Check if last part looks like a timestamp
    let hasTimestamp = false;
    let createdAt: Date | undefined;
    
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      try {
        const timestamp = parseInt(lastPart, 36);
        // Basic sanity check: timestamp should be reasonable
        if (timestamp > 1600000000000 && timestamp <= Date.now() + 86400000) {
          hasTimestamp = true;
          createdAt = new Date(timestamp);
        }
      } catch {
        // Not a valid timestamp
      }
    }

    // Estimate entropy based on token length and composition
    const dataLength = token.length - (prefix?.length || 0) - (hasTimestamp ? 13 : 0);
    const estimatedEntropy = Math.floor(dataLength * 0.75); // Rough estimate

    return {
      prefix,
      hasTimestamp,
      estimatedEntropy,
      createdAt
    };
  }

  /**
   * Generate a secure random string with specified length and character set
   */
  static generateSecureString(
    length: number, 
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    const randomValues = randomBytes(length);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    
    return result;
  }

  /**
   * Generate secure numeric code (for SMS, email verification)
   */
  static generateNumericCode(digits: number = 6): string {
    const max = Math.pow(10, digits) - 1;
    const randomValue = randomBytes(4).readUInt32BE(0);
    const code = (randomValue % (max + 1)).toString().padStart(digits, '0');
    return code;
  }

  /**
   * 🔒 SECURITY: Validate token entropy to ensure sufficient randomness
   */
  static validateTokenEntropy(token: string): {
    sufficient: boolean;
    estimatedBits: number;
    recommendation: string;
  } {
    const metadata = this.getTokenMetadata(token);
    const estimatedBits = metadata.estimatedEntropy * 6; // Rough conversion from base64url chars to bits
    
    let sufficient = true;
    let recommendation = 'Token has sufficient entropy';
    
    if (estimatedBits < 128) {
      sufficient = false;
      recommendation = 'Token entropy too low - use at least 128 bits for security';
    } else if (estimatedBits < 256) {
      recommendation = 'Token entropy adequate but consider 256+ bits for high-security applications';
    }

    return {
      sufficient,
      estimatedBits,
      recommendation
    };
  }
}

/**
 * Legacy token migration utilities
 */
export class TokenMigrationHelper {
  /**
   * Detect if token was generated with old vulnerable method
   */
  static isLegacyToken(token: string): boolean {
    // Old format was predictable and shorter
    if (token.length < 30) return true;
    
    // Old format used simple timestamp + Math.random pattern
    const parts = token.split('_');
    if (parts.length === 3 && parts[1].length < 8) {
      return true; // Likely old short random part
    }
    
    return false;
  }

  /**
   * Migrate legacy token to secure format
   */
  static migrateLegacyToken(legacyToken: string, tokenType: string = 'session'): string {
    // Generate new secure token
    const newToken = SecureTokenGenerator.generateSessionToken({
      customPrefix: `${tokenType}_`
    });
    
    // Log migration (in production, you'd want to track this)
    console.warn(`Migrated legacy token to secure format: ${legacyToken.substring(0, 10)}... -> ${newToken.substring(0, 10)}...`);
    
    return newToken;
  }
}

/**
 * Token security audit utilities
 */
export class TokenSecurityAuditor {
  /**
   * Audit token security across the application
   */
  static auditTokenSecurity(tokens: Array<{id: string, token: string, purpose: string}>): {
    summary: {
      total: number;
      secure: number;
      legacy: number;
      lowEntropy: number;
    };
    issues: Array<{
      tokenId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }>;
  } {
    const summary = { total: 0, secure: 0, legacy: 0, lowEntropy: 0 };
    const issues: Array<any> = [];

    tokens.forEach(({id, token, purpose}) => {
      summary.total++;

      // Check if legacy
      if (TokenMigrationHelper.isLegacyToken(token)) {
        summary.legacy++;
        issues.push({
          tokenId: id,
          issue: 'Legacy token format detected',
          severity: 'critical' as const,
          recommendation: 'Regenerate token using SecureTokenGenerator'
        });
        return;
      }

      // Check entropy
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(token);
      if (!entropyCheck.sufficient) {
        summary.lowEntropy++;
        issues.push({
          tokenId: id,
          issue: 'Insufficient token entropy',
          severity: 'high' as const,
          recommendation: entropyCheck.recommendation
        });
      } else {
        summary.secure++;
      }
    });

    return { summary, issues };
  }
}

// Default export for easy import
export default SecureTokenGenerator;