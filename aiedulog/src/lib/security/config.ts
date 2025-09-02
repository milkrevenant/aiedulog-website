/**
 * Security Configuration
 * Environment-based security settings with sensible defaults
 */

import { SecurityRole } from './core-security';

// Environment detection
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Global security configuration
export const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMITING: {
    ENABLED: true,
    STRICT_MODE: process.env.RATE_LIMIT_STRICT === 'true' || IS_PRODUCTION,
    MEMORY_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  },

  // Authentication
  AUTH: {
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    REQUIRE_VERIFIED_EMAIL: IS_PRODUCTION,
    ALLOW_ANONYMOUS_READ: true,
  },

  // CORS settings
  CORS: {
    ENABLED: true,
    ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://aiedulog.com',
      'https://www.aiedulog.com',
      '*.aiedulog.com'
    ],
    ALLOW_CREDENTIALS: true,
    MAX_AGE: 86400, // 24 hours
  },

  // CSRF protection
  CSRF: {
    ENABLED: true,
    TOKEN_LENGTH: 32,
    COOKIE_NAME: '_csrf',
    HEADER_NAME: 'x-csrf-token',
    EXEMPT_METHODS: ['GET', 'HEAD', 'OPTIONS'],
  },

  // Request validation
  REQUEST: {
    MAX_SIZE_MB: 10,
    MAX_SIZE_UPLOAD_MB: 50,
    ALLOWED_CONTENT_TYPES: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ],
  },

  // Audit logging
  AUDIT: {
    LEVEL: (process.env.SECURITY_AUDIT_LEVEL as 'none' | 'basic' | 'detailed') || 
           (IS_PRODUCTION ? 'basic' : 'detailed'),
    RETENTION_DAYS: 90,
    LOG_SUCCESSFUL_REQUESTS: false, // Only log security events by default
    LOG_INTERNAL_ERRORS: true,
  },

  // Threat detection
  THREATS: {
    ENABLED: true,
    SUSPICIOUS_USER_AGENTS: [
      'bot', 'crawler', 'spider', 'scraper',
      'curl', 'wget', 'python-requests',
      'go-http-client', 'java/', 'apache-httpclient'
    ],
    AUTO_BLOCK_THREATS: IS_PRODUCTION,
    RISK_THRESHOLD: {
      LOW: 10,
      MEDIUM: 25,
      HIGH: 50,
    },
  },

  // Error handling
  ERRORS: {
    SHOW_STACK_TRACES: IS_DEVELOPMENT,
    SHOW_SENSITIVE_INFO: IS_DEVELOPMENT,
    LOG_ALL_ERRORS: true,
    SANITIZE_ERROR_MESSAGES: IS_PRODUCTION,
  },

  // Security headers
  HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 year
    CONTENT_SECURITY_POLICY: IS_PRODUCTION
      ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self';"
      : "default-src 'self' 'unsafe-eval' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: http: https:;",
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    PERMISSIONS_POLICY: 'geolocation=(), camera=(), microphone=(), payment=()',
  },

  // Development overrides
  DEVELOPMENT: {
    BYPASS_RATE_LIMITS: process.env.DEV_BYPASS_RATE_LIMITS === 'true',
    BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true',
    VERBOSE_LOGGING: process.env.DEV_VERBOSE_SECURITY === 'true',
    ALLOW_INSECURE_REQUESTS: true,
  },
};

// Role-based access matrix
export const ROLE_PERMISSIONS = {
  [SecurityRole.ANONYMOUS]: {
    canRead: ['public'],
    canWrite: [],
    canDelete: [],
    canAdmin: [],
  },
  
  [SecurityRole.AUTHENTICATED]: {
    canRead: ['public', 'user_own'],
    canWrite: ['user_own'],
    canDelete: ['user_own_limited'],
    canAdmin: [],
  },
  
  [SecurityRole.VERIFIED]: {
    canRead: ['public', 'user_own', 'user_shared'],
    canWrite: ['user_own', 'user_shared'],
    canDelete: ['user_own'],
    canAdmin: [],
  },
  
  [SecurityRole.MODERATOR]: {
    canRead: ['public', 'user_own', 'user_shared', 'moderation'],
    canWrite: ['user_own', 'user_shared', 'moderation'],
    canDelete: ['user_own', 'moderation'],
    canAdmin: ['user_moderation'],
  },
  
  [SecurityRole.ADMIN]: {
    canRead: ['public', 'user_own', 'user_shared', 'moderation', 'admin'],
    canWrite: ['user_own', 'user_shared', 'moderation', 'admin'],
    canDelete: ['user_own', 'moderation', 'admin'],
    canAdmin: ['user_moderation', 'system_config', 'content_management'],
  },
  
  [SecurityRole.SUPER_ADMIN]: {
    canRead: ['*'],
    canWrite: ['*'],
    canDelete: ['*'],
    canAdmin: ['*'],
  },
  
  [SecurityRole.SYSTEM]: {
    canRead: ['*'],
    canWrite: ['*'],
    canDelete: ['*'],
    canAdmin: ['*'],
  },
};

// Rate limit configurations by endpoint type
export const RATE_LIMIT_CONFIGS = {
  'api_default': {
    windowMs: 15 * 60 * 1000,     // 15 minutes
    maxRequests: IS_PRODUCTION ? 100 : 1000, // Higher limits in dev
    blockDurationMs: 15 * 60 * 1000,
    progressiveBlock: false,
  },
  
  'auth': {
    windowMs: 15 * 60 * 1000,     // 15 minutes
    maxRequests: IS_PRODUCTION ? 10 : 100,
    blockDurationMs: 30 * 60 * 1000,
    progressiveBlock: true,
  },
  
  'admin': {
    windowMs: 60 * 60 * 1000,     // 1 hour
    maxRequests: IS_PRODUCTION ? 500 : 5000,
    blockDurationMs: 60 * 60 * 1000,
    progressiveBlock: false,
  },
  
  'user_management': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxRequests: IS_PRODUCTION ? 20 : 200,
    blockDurationMs: 10 * 60 * 1000,
    progressiveBlock: true,
  },
  
  'upload': {
    windowMs: 10 * 60 * 1000,     // 10 minutes
    maxRequests: IS_PRODUCTION ? 50 : 500,
    blockDurationMs: 20 * 60 * 1000,
    progressiveBlock: true,
  },
  
  'security': {
    windowMs: 60 * 60 * 1000,     // 1 hour
    maxRequests: IS_PRODUCTION ? 5 : 50,
    blockDurationMs: 2 * 60 * 60 * 1000,
    progressiveBlock: true,
  },
};

// IP whitelist for development and trusted sources
export const TRUSTED_IPS = [
  '127.0.0.1',
  '::1',
  '192.168.1.0/24',   // Local network
  '10.0.0.0/8',       // Private network
  '172.16.0.0/12',    // Private network
];

// Environment-specific overrides
if (IS_DEVELOPMENT) {
  // Relax security for development
  SECURITY_CONFIG.AUTH.REQUIRE_VERIFIED_EMAIL = false;
  SECURITY_CONFIG.THREATS.AUTO_BLOCK_THREATS = false;
  SECURITY_CONFIG.AUDIT.LOG_SUCCESSFUL_REQUESTS = false;
}

// Validate configuration
export function validateSecurityConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate CORS origins
  if (SECURITY_CONFIG.CORS.ALLOWED_ORIGINS.length === 0) {
    errors.push('CORS allowed origins cannot be empty');
  }
  
  // Validate audit level
  const validAuditLevels = ['none', 'basic', 'detailed'];
  if (!validAuditLevels.includes(SECURITY_CONFIG.AUDIT.LEVEL)) {
    errors.push(`Invalid audit level: ${SECURITY_CONFIG.AUDIT.LEVEL}`);
  }
  
  // Validate rate limit configs
  for (const [key, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (config.maxRequests <= 0) {
      errors.push(`Invalid max requests for ${key}: ${config.maxRequests}`);
    }
    if (config.windowMs <= 0) {
      errors.push(`Invalid window duration for ${key}: ${config.windowMs}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get configuration for specific environment
export function getEnvironmentConfig() {
  const config = {
    environment: process.env.NODE_ENV,
    isDevelopment: IS_DEVELOPMENT,
    isProduction: IS_PRODUCTION,
    security: SECURITY_CONFIG,
    rateLimits: RATE_LIMIT_CONFIGS,
    rolePermissions: ROLE_PERMISSIONS,
    trustedIPs: TRUSTED_IPS,
  };
  
  const validation = validateSecurityConfig();
  if (!validation.valid) {
    console.error('Security configuration validation failed:', validation.errors);
  }
  
  return config;
}

export default SECURITY_CONFIG;