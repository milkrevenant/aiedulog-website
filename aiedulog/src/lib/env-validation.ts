/**
 * Environment Variable Validation
 * Validates required environment variables with build-time safety
 * Enhanced for AWS Amplify deployment compatibility
 */

// Edge Runtime type declaration
declare const EdgeRuntime: string | undefined

/**
 * Detect if running in AWS Amplify build environment
 */
export function isAmplifyBuild(): boolean {
  return !!(process.env.AWS_APP_ID || process.env._HANDLER || process.env.AWS_REGION);
}

/**
 * Detect if running in production environment for env validation
 */
export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

interface EnvConfig {
  NODE_ENV?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_PUBLISHABLE_KEY?: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
}

/**
 * Safely get environment variable with build-time fallback
 */
export function getEnvVar(key: keyof EnvConfig, fallback?: string): string | undefined {
  if (typeof process === 'undefined') {
    return fallback
  }
  
  // In Amplify builds, log missing critical environment variables
  if (isAmplifyBuild() && !process.env[key] && ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].includes(key)) {
    console.warn(`[AMPLIFY BUILD] Critical environment variable missing: ${key}`);
  }
  
  return process.env[key] || fallback
}

/**
 * Validate critical environment variables for Amplify deployment
 */
export function validateAmplifyEnvironment(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check critical public environment variables
  const requiredPublicVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  ];
  
  requiredPublicVars.forEach(key => {
    if (!getEnvVar(key as keyof EnvConfig)) {
      errors.push(`Missing required public environment variable: ${key}`);
    }
  });
  
  // Check if we're in Amplify environment
  if (isAmplifyBuild()) {
    warnings.push('Running in AWS Amplify build environment');
  }
  
  // Check Node environment
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set, assuming development');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(): { isValid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = []
  const warnings: string[] = []
  
  // Skip validation during build if process is not available
  if (typeof process === 'undefined') {
    return { isValid: true, missing: [], warnings: ['Process not available during build - skipping validation'] }
  }

  const requiredVars: (keyof EnvConfig)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  ]

  const optionalVars: (keyof EnvConfig)[] = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ]

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  // Check optional variables and warn if missing
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable ${varName} is not set`)
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Get Stripe configuration with safety checks
 */
export function getStripeConfig(): {
  secretKey?: string
  publishableKey?: string
  webhookSecret?: string
  isAvailable: boolean
} {
  const secretKey = getEnvVar('STRIPE_SECRET_KEY')
  const publishableKey = getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  const webhookSecret = getEnvVar('STRIPE_WEBHOOK_SECRET')

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isAvailable: !!(secretKey || publishableKey)
  }
}

/**
 * Get Supabase configuration with safety checks
 */
export function getSupabaseConfig(): {
  url?: string
  publishableKey?: string
  isAvailable: boolean
} {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const publishableKey = getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  return {
    url,
    publishableKey,
    isAvailable: !!(url && publishableKey)
  }
}

/**
 * Runtime environment detection - Aligned with security system
 * For comprehensive runtime detection, use ./security/runtime-detector.ts
 */
export function getRuntime(): 'edge' | 'node' | 'browser' | 'unknown' {
  // Browser environment
  if (typeof window !== 'undefined') {
    return 'browser'
  }
  
  // Edge Runtime detection
  if (typeof EdgeRuntime !== 'undefined') {
    return 'edge'
  }
  
  // Node.js environment - safe check without accessing process.versions
  if (
    typeof globalThis !== 'undefined' &&
    typeof process !== 'undefined' &&
    typeof require !== 'undefined' &&
    typeof module !== 'undefined'
  ) {
    return 'node'
  }
  
  return 'unknown'
}

/**
 * Check if running in a server environment
 */
export function isServerEnvironment(): boolean {
  const runtime = getRuntime()
  return runtime === 'edge' || runtime === 'node'
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV') === 'production'
}

/**
 * Safe environment info getter
 */
export function getEnvironmentInfo(): {
  runtime: string
  nodeEnv: string
  isProduction: boolean
  isServer: boolean
  timestamp: number
} {
  return {
    runtime: getRuntime(),
    nodeEnv: getEnvVar('NODE_ENV', 'development')!,
    isProduction: isProduction(),
    isServer: isServerEnvironment(),
    timestamp: Date.now()
  }
}