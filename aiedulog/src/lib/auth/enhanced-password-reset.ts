/**
 * Enhanced Password Reset System
 * 
 * This module provides a fundamental solution for secure password reset
 * by integrating server-side security functions with client-side validation.
 */

import { createClient } from '@/lib/supabase/client'
import { Security } from '@/lib/security/implementation-guide'

// ============================================
// TYPES
// ============================================

export interface PasswordResetRequest {
  email: string
  ipAddress?: string
  userAgent?: string
}

export interface PasswordUpdateRequest {
  password: string
  confirmPassword: string
  ipAddress?: string
}

export interface SecurityCheckResult {
  allowed: boolean
  message: string
  remainingTime?: number
  requiresCaptcha?: boolean
  requiresMFA?: boolean
}

export interface PasswordValidationResult {
  isValid: boolean
  score: number
  feedback: string[]
  suggestions?: string[]
}

// ============================================
// ENHANCED PASSWORD VALIDATION
// ============================================

/**
 * Ultra-secure password validation with multiple checks
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const feedback: string[] = []
  const suggestions: string[] = []
  let score = 0

  // 1. Length requirements (enhanced)
  if (password.length < 8) {
    feedback.push('비밀번호는 최소 8자 이상이어야 합니다.')
    suggestions.push('더 긴 비밀번호를 사용하세요.')
    return { isValid: false, score: 0, feedback, suggestions }
  }
  if (password.length >= 8) score += 2
  if (password.length >= 12) score += 2
  if (password.length >= 16) score += 2

  // 2. Character complexity
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(password)

  if (!hasUpper) feedback.push('대문자를 포함해야 합니다.')
  else score += 2

  if (!hasLower) feedback.push('소문자를 포함해야 합니다.')
  else score += 2

  if (!hasNumber) feedback.push('숫자를 포함해야 합니다.')
  else score += 2

  if (!hasSpecial) feedback.push('특수문자를 포함해야 합니다.')
  else score += 2

  // 3. Pattern detection (weak passwords)
  const weakPatterns = [
    /^12345/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /^admin/i,
    /^test/i,
    /(.)\1{3,}/, // Repeated characters (4+ times)
    /^[0-9]+$/, // Only numbers
    /^[a-z]+$/i, // Only letters
  ]

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      feedback.push('일반적이거나 예측 가능한 패턴이 감지되었습니다.')
      score = Math.max(0, score - 4)
      suggestions.push('더 복잡하고 무작위한 비밀번호를 사용하세요.')
      break
    }
  }

  // 4. Dictionary word check (simple)
  const commonWords = ['password', 'admin', 'user', 'test', 'demo', 'example']
  const lowerPassword = password.toLowerCase()
  for (const word of commonWords) {
    if (lowerPassword.includes(word)) {
      feedback.push('사전에 있는 단어를 포함하고 있습니다.')
      suggestions.push('사전 단어 대신 무작위 문자 조합을 사용하세요.')
      score = Math.max(0, score - 2)
      break
    }
  }

  // 5. Sequential character check
  const hasSequential = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)
  if (hasSequential) {
    feedback.push('연속된 문자나 숫자를 피하세요.')
    score = Math.max(0, score - 2)
  }

  // 6. Korean characters bonus
  if (hasKorean) {
    score += 1
    if (feedback.length === 0) {
      suggestions.push('한글 문자 사용이 감지되었습니다. 좋습니다!')
    }
  }

  // Calculate final score (0-20 scale, normalized to 0-4)
  const normalizedScore = Math.min(4, Math.floor(score / 5))
  
  // Generate strength feedback
  const isValid = feedback.length === 0 && score >= 8
  
  if (isValid) {
    if (normalizedScore <= 1) feedback.push('약한 비밀번호입니다. 더 강력한 비밀번호를 권장합니다.')
    else if (normalizedScore === 2) feedback.push('보통 강도의 비밀번호입니다.')
    else if (normalizedScore === 3) feedback.push('강한 비밀번호입니다.')
    else feedback.push('매우 강한 비밀번호입니다! 👍')
  }

  // Add suggestions for improvement
  if (score < 12) {
    if (password.length < 12) {
      suggestions.push('12자 이상으로 늘리면 더 안전합니다.')
    }
    if (!hasSpecial) {
      suggestions.push('특수문자를 추가하면 보안이 향상됩니다.')
    }
    if (!hasKorean) {
      suggestions.push('한글 문자를 섞으면 더욱 안전합니다.')
    }
  }

  return {
    isValid,
    score: normalizedScore,
    feedback,
    suggestions
  }
}

// ============================================
// SERVER-SIDE SECURITY INTEGRATION
// ============================================

/**
 * Enhanced password reset request with server-side rate limiting
 */
export async function requestPasswordReset(
  request: PasswordResetRequest
): Promise<SecurityCheckResult> {
  try {
    // 1. Server-side rate limit check
    const rateLimit = await Security.checkRateLimit(
      'password_reset',
      3, // max 3 attempts
      60, // in 60 minutes
      60  // block for 60 minutes
    )

    if (!rateLimit.allowed) {
      return {
        allowed: false,
        message: rateLimit.message || '너무 많은 요청입니다. 1시간 후에 다시 시도해주세요.',
        remainingTime: 3600000 // 1 hour in milliseconds
      }
    }

    // 2. Check for suspicious activity
    if (request.ipAddress) {
      const ipCheck = await Security.checkIPRestriction(request.ipAddress)
      if (ipCheck === 'blocked') {
        await Security.logSecurityEvent(
          'suspicious_activity',
          { email: request.email, reason: 'blocked_ip' },
          'high',
          request.ipAddress
        )
        
        return {
          allowed: false,
          message: '보안상의 이유로 요청이 차단되었습니다.',
          requiresCaptcha: true
        }
      }
    }

    // 3. Send password reset email
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(request.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    // 4. Log the event (regardless of success)
    await Security.logSecurityEvent(
      'password_reset_requested',
      { 
        email: request.email,
        success: !error,
        userAgent: request.userAgent 
      },
      'medium',
      request.ipAddress
    )

    // 5. Always return success (prevent user enumeration)
    return {
      allowed: true,
      message: '이메일이 등록되어 있다면 비밀번호 재설정 링크가 전송됩니다.'
    }
  } catch (error) {
    console.error('Password reset error:', error)
    
    // Log critical error
    await Security.logSecurityEvent(
      'password_reset_requested',
      { 
        email: request.email,
        error: String(error)
      },
      'critical',
      request.ipAddress
    )

    return {
      allowed: false,
      message: '시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }
  }
}

/**
 * Enhanced password update with comprehensive security
 */
export async function updatePassword(
  request: PasswordUpdateRequest
): Promise<SecurityCheckResult> {
  const supabase = createClient()

  try {
    // 1. Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return {
        allowed: false,
        message: '세션이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.'
      }
    }

    // 2. Validate password strength
    const validation = validatePasswordStrength(request.password)
    if (!validation.isValid) {
      return {
        allowed: false,
        message: validation.feedback.join(' ')
      }
    }

    // 3. Check password match
    if (request.password !== request.confirmPassword) {
      return {
        allowed: false,
        message: '비밀번호가 일치하지 않습니다.'
      }
    }

    // 4. Server-side password validation
    const serverValid = await Security.validatePasswordOnServer(request.password)
    if (!serverValid) {
      return {
        allowed: false,
        message: '비밀번호가 보안 요구사항을 충족하지 않습니다.'
      }
    }

    // 5. Check for compromised password (if available)
    // This would require integration with HaveIBeenPwned API
    // const isCompromised = await checkCompromisedPassword(request.password)
    // if (isCompromised) {
    //   return {
    //     allowed: false,
    //     message: '이 비밀번호는 데이터 유출에서 발견되었습니다. 다른 비밀번호를 선택하세요.'
    //   }
    // }

    // 6. Perform comprehensive security check
    const securityCheck = await Security.performSecurityCheck(
      session.user.id,
      request.ipAddress,
      'password_change'
    )

    if (!securityCheck.allowed) {
      await Security.logSecurityEvent(
        'suspicious_activity',
        { 
          userId: session.user.id,
          blocked: true,
          reasons: securityCheck.reasons
        },
        'high',
        request.ipAddress
      )

      return {
        allowed: false,
        message: '보안 검증에 실패했습니다.',
        requiresMFA: securityCheck.requiresMFA
      }
    }

    // 7. Update the password
    const { error } = await supabase.auth.updateUser({
      password: request.password
    })

    if (error) {
      throw error
    }

    // 8. Revoke all other sessions
    await Security.revokeAllSessions(session.user.id)

    // 9. Log successful password change
    await Security.logSecurityEvent(
      'password_changed',
      { 
        userId: session.user.id,
        method: 'reset_link'
      },
      'high',
      request.ipAddress
    )

    // 10. Sign out current session
    await supabase.auth.signOut()

    return {
      allowed: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.'
    }
  } catch (error) {
    console.error('Password update error:', error)
    
    // Log error
    await Security.logSecurityEvent(
      'login_failed',
      { 
        error: String(error),
        failed: true
      },
      'critical',
      request.ipAddress
    )

    return {
      allowed: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.'
    }
  }
}

// ============================================
// MONITORING & ANALYTICS
// ============================================

/**
 * Get password reset analytics
 */
export async function getPasswordResetAnalytics(
  timeRange: 'day' | 'week' | 'month' = 'week'
): Promise<{
  totalRequests: number
  successfulResets: number
  blockedAttempts: number
  averageCompletionTime: number
}> {
  const supabase = createClient()
  
  const timeFilter = {
    day: '1 day',
    week: '7 days',
    month: '30 days'
  }[timeRange]

  const { data, error } = await supabase.rpc('get_security_event_stats', {
    p_event_type: 'password_reset%',
    p_time_range: timeFilter
  })

  if (error || !data) {
    return {
      totalRequests: 0,
      successfulResets: 0,
      blockedAttempts: 0,
      averageCompletionTime: 0
    }
  }

  return data
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate secure random password
 */
export function generateSecurePassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const korean = '가나다라마바사아자차카타파하'
  
  const allChars = uppercase + lowercase + numbers + special + korean
  
  let password = ''
  
  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Check password against common breach databases
 * (Requires external API integration)
 */
export async function checkCompromisedPassword(password: string): Promise<boolean> {
  // TODO: Integrate with HaveIBeenPwned API
  // For now, return false (not compromised)
  return false
}

/**
 * Get client IP address (best effort)
 */
export function getClientIP(): string | undefined {
  // In production, this would come from request headers
  // For now, return undefined
  return undefined
}

/**
 * Check if email is valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
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
 * Simple client-side rate limiter (for UI feedback)
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

// ============================================
// EXPORT
// ============================================

export const EnhancedPasswordReset = {
  validatePasswordStrength,
  requestPasswordReset,
  updatePassword,
  getPasswordResetAnalytics,
  generateSecurePassword,
  checkCompromisedPassword,
  getClientIP
}