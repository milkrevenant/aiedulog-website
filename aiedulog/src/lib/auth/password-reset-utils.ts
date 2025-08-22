/**
 * Password Reset Utility Functions
 * Provides helper functions for password reset flow
 */

interface PasswordStrength {
  score: number // 0-4
  feedback: string
  isValid: boolean
}

/**
 * Validate password strength
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  else if (password.length < 6) {
    return {
      score: 0,
      feedback: '비밀번호는 최소 6자 이상이어야 합니다.',
      isValid: false
    }
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  // Generate feedback
  if (score <= 2) {
    feedback.push('더 강력한 비밀번호를 사용하세요.')
    if (!/[A-Z]/.test(password)) feedback.push('대문자를 포함하면 더 안전합니다.')
    if (!/[0-9]/.test(password)) feedback.push('숫자를 포함하면 더 안전합니다.')
    if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('특수문자를 포함하면 더 안전합니다.')
  } else if (score === 3) {
    feedback.push('적당한 강도의 비밀번호입니다.')
  } else {
    feedback.push('강력한 비밀번호입니다!')
  }

  return {
    score: Math.min(Math.floor(score / 1.5), 4), // Normalize to 0-4
    feedback: feedback.join(' '),
    isValid: password.length >= 6
  }
}

/**
 * Check if email is valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Rate limiter for password reset requests
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly maxAttempts: number
  private readonly windowMs: number

  constructor(maxAttempts = 3, windowMs = 60000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  isAllowed(key: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs)
    
    if (validAttempts.length >= this.maxAttempts) {
      this.attempts.set(key, validAttempts)
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    return true
  }

  getRemainingTime(key: string): number {
    const attempts = this.attempts.get(key) || []
    if (attempts.length === 0) return 0
    
    const oldestAttempt = Math.min(...attempts)
    const timeElapsed = Date.now() - oldestAttempt
    const remainingTime = Math.max(0, this.windowMs - timeElapsed)
    
    return Math.ceil(remainingTime / 1000) // Return seconds
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

/**
 * Generate secure random token (for testing/demo purposes)
 */
export function generateMockToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Parse callback URL parameters
 */
export function parseCallbackParams(url: string) {
  const hashParams = new URLSearchParams(url.split('#')[1] || '')
  const queryParams = new URLSearchParams(url.split('?')[1]?.split('#')[0] || '')
  
  return {
    access_token: hashParams.get('access_token') || queryParams.get('access_token'),
    refresh_token: hashParams.get('refresh_token') || queryParams.get('refresh_token'),
    token_type: hashParams.get('token_type') || queryParams.get('token_type'),
    type: hashParams.get('type') || queryParams.get('type'),
    error: hashParams.get('error') || queryParams.get('error'),
    error_description: hashParams.get('error_description') || queryParams.get('error_description'),
  }
}

/**
 * Format time remaining for rate limit
 */
export function formatRateLimitTime(seconds: number): string {
  if (seconds <= 0) return '지금 다시 시도할 수 있습니다.'
  if (seconds < 60) return `${seconds}초 후에 다시 시도해주세요.`
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds === 0) {
    return `${minutes}분 후에 다시 시도해주세요.`
  }
  return `${minutes}분 ${remainingSeconds}초 후에 다시 시도해주세요.`
}

/**
 * Validate password reset token format
 */
export function isValidResetToken(token: string | null): boolean {
  if (!token) return false
  // Basic validation - token should be alphanumeric and reasonable length
  return /^[a-zA-Z0-9_-]{20,}$/.test(token)
}

/**
 * Sanitize error messages for user display
 */
export function sanitizeErrorMessage(error: string): string {
  // Remove technical details from error messages
  const technicalPatterns = [
    /\bat\b.*$/i, // Stack traces
    /\bline\s+\d+/i, // Line numbers
    /\bcolumn\s+\d+/i, // Column numbers
    /\b[A-Z][a-z]+Error:/i, // Error types
    /\{\s*".*"\s*}/g, // JSON objects
  ]
  
  let sanitized = error
  technicalPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })
  
  return sanitized.trim() || '오류가 발생했습니다. 다시 시도해주세요.'
}