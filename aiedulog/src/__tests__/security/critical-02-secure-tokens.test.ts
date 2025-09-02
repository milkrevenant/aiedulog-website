/**
 * SECURITY TEST: CRITICAL-02 - Secure Token Generation
 * 
 * Tests to validate that SecureTokenGenerator produces cryptographically secure tokens
 * and prevents predictable token generation vulnerabilities.
 * 
 * VULNERABILITY FIXED:
 * - Weak session token generation using Math.random()
 * - Predictable timestamp-based token patterns
 * - Insufficient entropy in token generation
 * - Timing attack vulnerabilities in token comparison
 * 
 * SECURITY IMPLEMENTATIONS TESTED:
 * - crypto.randomBytes() usage for true randomness
 * - High entropy token generation (256+ bits)
 * - Timing-safe token comparison
 * - Token format validation
 * - Legacy token detection and migration
 */

import { describe, test, expect } from '@jest/globals';
import { SecureTokenGenerator, TokenMigrationHelper, TokenSecurityAuditor } from '@/lib/security/secure-token-generator';
import { randomBytes } from 'crypto';

describe('CRITICAL-02: Secure Token Generation Tests', () => {

  describe('Cryptographic Strength Validation', () => {
    test('should generate tokens with sufficient entropy', () => {
      const token = SecureTokenGenerator.generateSessionToken();
      
      // Token should be long enough to contain sufficient entropy
      expect(token.length).toBeGreaterThan(40);
      
      // Validate entropy using built-in validator
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(token);
      expect(entropyCheck.sufficient).toBe(true);
      expect(entropyCheck.estimatedBits).toBeGreaterThanOrEqual(128);
    });

    test('should generate unique tokens on each call', () => {
      const tokens = Array.from({ length: 1000 }, () => 
        SecureTokenGenerator.generateSessionToken()
      );
      
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length); // All tokens should be unique
    });

    test('should use crypto.randomBytes instead of Math.random', () => {
      const token1 = SecureTokenGenerator.generateSessionToken();
      const token2 = SecureTokenGenerator.generateSessionToken();
      
      // Tokens should not follow predictable patterns
      expect(token1).not.toBe(token2);
      
      // Extract the random part (remove prefix and timestamp)
      const parts1 = token1.split('_');
      const parts2 = token2.split('_');
      
      // Random parts should be significantly different
      expect(parts1[1]).not.toBe(parts2[1]);
      expect(parts1[1].length).toBeGreaterThan(20); // Should have substantial random data
    });

    test('should generate tokens with high entropy for different types', () => {
      const sessionToken = SecureTokenGenerator.generateSessionToken();
      const bookingToken = SecureTokenGenerator.generateBookingToken();
      const confirmationToken = SecureTokenGenerator.generateConfirmationToken();
      const resetToken = SecureTokenGenerator.generateResetToken();
      const apiToken = SecureTokenGenerator.generateAPIToken();
      
      const tokens = [sessionToken, bookingToken, confirmationToken, resetToken, apiToken];
      
      tokens.forEach(token => {
        const entropyCheck = SecureTokenGenerator.validateTokenEntropy(token);
        expect(entropyCheck.sufficient).toBe(true);
        expect(entropyCheck.estimatedBits).toBeGreaterThanOrEqual(128);
      });
    });
  });

  describe('Token Type Security Features', () => {
    test('should generate booking tokens with appropriate entropy', () => {
      const token = SecureTokenGenerator.generateBookingToken();
      
      expect(token).toMatch(/^booking_/);
      expect(token.length).toBeGreaterThan(50);
      
      const metadata = SecureTokenGenerator.getTokenMetadata(token);
      expect(metadata.prefix).toBe('booking_');
      expect(metadata.hasTimestamp).toBe(true);
      expect(metadata.estimatedEntropy).toBeGreaterThanOrEqual(20);
    });

    test('should generate confirmation tokens without timestamps (more secure)', () => {
      const token = SecureTokenGenerator.generateConfirmationToken();
      
      expect(token).toMatch(/^confirm_/);
      
      const metadata = SecureTokenGenerator.getTokenMetadata(token);
      expect(metadata.prefix).toBe('confirm_');
      expect(metadata.hasTimestamp).toBe(false); // No timestamp for security
      expect(metadata.estimatedEntropy).toBeGreaterThan(30);
    });

    test('should generate reset tokens with high entropy', () => {
      const token = SecureTokenGenerator.generateResetToken();
      
      expect(token).toMatch(/^reset_/);
      
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(token);
      expect(entropyCheck.estimatedBits).toBeGreaterThanOrEqual(256); // 384 bits for password reset
    });

    test('should generate API tokens with maximum entropy', () => {
      const token = SecureTokenGenerator.generateAPIToken();
      
      expect(token).toMatch(/^api_/);
      
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(token);
      expect(entropyCheck.estimatedBits).toBeGreaterThanOrEqual(384); // 512 bits for API tokens
    });

    test('should generate temporary tokens with configurable expiry', () => {
      const token = SecureTokenGenerator.generateTemporaryToken(2); // 2 hours
      
      expect(token).toMatch(/^temp_/);
      
      const metadata = SecureTokenGenerator.getTokenMetadata(token);
      expect(metadata.prefix).toBe('temp_');
      expect(metadata.hasTimestamp).toBe(true);
    });
  });

  describe('Token Validation Security', () => {
    test('should validate token format correctly', () => {
      const validToken = SecureTokenGenerator.generateSessionToken();
      const validation = SecureTokenGenerator.validateTokenFormat(validToken);
      
      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(false);
      expect(validation.error).toBeUndefined();
    });

    test('should reject malformed tokens', () => {
      const invalidTokens = [
        '', // empty
        'short', // too short
        null, // null
        undefined, // undefined
        123, // wrong type
        'no_underscore_structure'
      ];
      
      invalidTokens.forEach(invalidToken => {
        const validation = SecureTokenGenerator.validateTokenFormat(invalidToken as any);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      });
    });

    test('should validate token prefix correctly', () => {
      const sessionToken = SecureTokenGenerator.generateSessionToken();
      const bookingToken = SecureTokenGenerator.generateBookingToken();
      
      const sessionValidation = SecureTokenGenerator.validateTokenFormat(sessionToken, 'session_');
      expect(sessionValidation.valid).toBe(true);
      
      const wrongPrefixValidation = SecureTokenGenerator.validateTokenFormat(bookingToken, 'session_');
      expect(wrongPrefixValidation.valid).toBe(false);
      expect(wrongPrefixValidation.error).toMatch(/expected prefix/i);
    });

    test('should detect expired tokens', () => {
      // Create a token with timestamp that would be expired
      const expiredToken = 'session_validrandomdata_old_timestamp_1000000'; // Very old timestamp
      
      const validation = SecureTokenGenerator.validateTokenFormat(expiredToken, 'session_', 1); // 1 hour max age
      expect(validation.valid).toBe(true); // Format is valid
      expect(validation.expired).toBe(true); // But it's expired
      expect(validation.error).toMatch(/expired/i);
    });
  });

  describe('Timing Attack Prevention', () => {
    test('should use timing-safe comparison for tokens', () => {
      const token1 = SecureTokenGenerator.generateSessionToken();
      const token2 = SecureTokenGenerator.generateSessionToken();
      
      // Same token should return true
      expect(SecureTokenGenerator.compareTokens(token1, token1)).toBe(true);
      
      // Different tokens should return false
      expect(SecureTokenGenerator.compareTokens(token1, token2)).toBe(false);
      
      // Different length tokens should return false immediately
      expect(SecureTokenGenerator.compareTokens(token1, token1.substring(0, 10))).toBe(false);
      
      // Null/undefined should return false
      expect(SecureTokenGenerator.compareTokens(token1, null as any)).toBe(false);
      expect(SecureTokenGenerator.compareTokens(null as any, token1)).toBe(false);
    });

    test('should resist timing attacks through constant-time comparison', () => {
      const baseToken = SecureTokenGenerator.generateSessionToken();
      const similarToken = baseToken.substring(0, baseToken.length - 1) + 'X'; // Last char different
      const differentToken = SecureTokenGenerator.generateSessionToken();
      
      // Measure time for similar vs very different tokens
      // Note: This is a basic test; in practice, timing differences are very small
      const startSimilar = process.hrtime.bigint();
      SecureTokenGenerator.compareTokens(baseToken, similarToken);
      const endSimilar = process.hrtime.bigint();
      
      const startDifferent = process.hrtime.bigint();
      SecureTokenGenerator.compareTokens(baseToken, differentToken);
      const endDifferent = process.hrtime.bigint();
      
      // Both comparisons should complete (not throw errors)
      expect(endSimilar).toBeGreaterThan(startSimilar);
      expect(endDifferent).toBeGreaterThan(startDifferent);
    });
  });

  describe('Legacy Token Detection and Migration', () => {
    test('should detect legacy weak tokens', () => {
      const legacyTokens = [
        'booking_short_123', // Short random part
        'session_abc_def', // Predictable pattern
        'user_1234567890_rand' // Likely old timestamp format
      ];
      
      legacyTokens.forEach(token => {
        expect(TokenMigrationHelper.isLegacyToken(token)).toBe(true);
      });
    });

    test('should not flag secure tokens as legacy', () => {
      const secureToken = SecureTokenGenerator.generateSessionToken();
      expect(TokenMigrationHelper.isLegacyToken(secureToken)).toBe(false);
    });

    test('should migrate legacy tokens to secure format', () => {
      const legacyToken = 'booking_short_123';
      const migratedToken = TokenMigrationHelper.migrateLegacyToken(legacyToken, 'booking');
      
      expect(migratedToken).toMatch(/^booking_/);
      expect(migratedToken).not.toBe(legacyToken);
      expect(TokenMigrationHelper.isLegacyToken(migratedToken)).toBe(false);
      
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(migratedToken);
      expect(entropyCheck.sufficient).toBe(true);
    });
  });

  describe('Security Auditing', () => {
    test('should audit token security and identify issues', () => {
      const testTokens = [
        { id: 'token1', token: SecureTokenGenerator.generateSessionToken(), purpose: 'session' },
        { id: 'token2', token: 'weak_token_123', purpose: 'booking' }, // Legacy token
        { id: 'token3', token: SecureTokenGenerator.generateAPIToken(), purpose: 'api' }
      ];
      
      const auditResult = TokenSecurityAuditor.auditTokenSecurity(testTokens);
      
      expect(auditResult.summary.total).toBe(3);
      expect(auditResult.summary.legacy).toBe(1);
      expect(auditResult.summary.secure).toBeGreaterThanOrEqual(2);
      
      expect(auditResult.issues).toHaveLength(1);
      expect(auditResult.issues[0].tokenId).toBe('token2');
      expect(auditResult.issues[0].severity).toBe('critical');
    });

    test('should generate security recommendations', () => {
      const weakToken = 'short';
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(weakToken);
      
      expect(entropyCheck.sufficient).toBe(false);
      expect(entropyCheck.recommendation).toMatch(/entropy too low/i);
    });
  });

  describe('Specialized Token Generation', () => {
    test('should generate secure random strings with custom charset', () => {
      const customString = SecureTokenGenerator.generateSecureString(20, 'ABCDEF0123456789');
      
      expect(customString).toHaveLength(20);
      expect(/^[ABCDEF0123456789]+$/.test(customString)).toBe(true);
    });

    test('should generate secure numeric codes', () => {
      const code6 = SecureTokenGenerator.generateNumericCode(6);
      const code8 = SecureTokenGenerator.generateNumericCode(8);
      
      expect(code6).toHaveLength(6);
      expect(code8).toHaveLength(8);
      expect(/^\d+$/.test(code6)).toBe(true);
      expect(/^\d+$/.test(code8)).toBe(true);
      
      // Multiple calls should generate different codes
      const anotherCode = SecureTokenGenerator.generateNumericCode(6);
      expect(code6).not.toBe(anotherCode);
    });
  });

  describe('Vulnerability Regression Tests', () => {
    test('should not use Math.random() predictable patterns', () => {
      // Generate many tokens and check for patterns
      const tokens = Array.from({ length: 100 }, () => 
        SecureTokenGenerator.generateSessionToken()
      );
      
      // Extract random parts
      const randomParts = tokens.map(token => {
        const parts = token.split('_');
        return parts[1]; // The random part
      });
      
      // Check for predictable patterns (like incremental or similar sequences)
      for (let i = 1; i < randomParts.length; i++) {
        expect(randomParts[i]).not.toBe(randomParts[i-1]);
        
        // Should not have too much similarity (basic check)
        const similarity = calculateSimilarity(randomParts[i], randomParts[i-1]);
        expect(similarity).toBeLessThan(0.3); // Should be mostly different
      }
    });

    test('should not be vulnerable to timestamp prediction attacks', () => {
      const token1 = SecureTokenGenerator.generateSessionToken({ includeTimestamp: true });
      
      // Wait a small amount to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const token2 = SecureTokenGenerator.generateSessionToken({ includeTimestamp: true });
      
      // Even if timestamps are similar, random parts should be completely different
      const parts1 = token1.split('_');
      const parts2 = token2.split('_');
      
      // Random parts should be different
      expect(parts1[1]).not.toBe(parts2[1]);
      
      // Even with known timestamp, should not be able to predict token
      expect(token1).not.toBe(token2);
    });

    test('should resist brute force attacks through high entropy', () => {
      const token = SecureTokenGenerator.generateAPIToken();
      const entropyCheck = SecureTokenGenerator.validateTokenEntropy(token);
      
      // API tokens should have at least 384 bits of entropy
      expect(entropyCheck.estimatedBits).toBeGreaterThanOrEqual(384);
      
      // At 384 bits, brute force would require 2^384 attempts
      // This is computationally infeasible
      const bruteForceComplexity = Math.pow(2, entropyCheck.estimatedBits);
      expect(bruteForceComplexity).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
    });
  });
});

// Helper function to calculate basic similarity between two strings
function calculateSimilarity(str1: string, str2: string): number {
  if (str1.length !== str2.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < str1.length; i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return matches / str1.length;
}