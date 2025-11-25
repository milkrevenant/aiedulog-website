/**
 * Security Implementation Guide for AIedulog
 * 
 * This file provides TypeScript/JavaScript examples for using
 * the comprehensive security system implemented in Supabase.
 */

import { createClient } from '@/lib/supabase/client'

// ============================================
// 1. RATE LIMITING IMPLEMENTATION
// ============================================

/**
 * Check rate limit before allowing an action
 */
export async function checkRateLimit(
  action: string,
  maxAttempts = 5,
  windowMinutes = 60,
  blockMinutes = 30
): Promise<{ allowed: boolean; message?: string }> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_action_type: action,
    p_max_attempts: maxAttempts,
    p_window_minutes: windowMinutes,
    p_block_minutes: blockMinutes
  })

  if (error || !data) {
    return { 
      allowed: false, 
      message: '요청 처리 중 오류가 발생했습니다.' 
    }
  }

  if (!data) {
    return { 
      allowed: false, 
      message: `너무 많은 요청입니다. ${blockMinutes}분 후에 다시 시도해주세요.` 
    }
  }

  return { allowed: true }
}

// ============================================
// 2. COMPREHENSIVE AUTH CHECK
// ============================================

/**
 * Perform comprehensive security check before sensitive operations
 */
export async function performSecurityCheck(
  userId: string,
  ipAddress?: string,
  action = 'login'
): Promise<{
  allowed: boolean
  requiresMFA?: boolean
  reasons: string[]
}> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('comprehensive_auth_check', {
    p_user_id: userId,
    p_ip_address: ipAddress,
    p_action: action
  })

  if (error || !data) {
    return {
      allowed: false,
      reasons: ['보안 검증 실패']
    }
  }

  const result = data as {
    allowed?: boolean
    requires_mfa?: boolean
    reasons?: string[]
  }

  return {
    allowed: result.allowed ?? false,
    requiresMFA: result.requires_mfa,
    reasons: result.reasons || []
  }
}

// ============================================
// 3. PASSWORD VALIDATION
// ============================================

/**
 * Validate password strength on client side
 * (Also validated on server for security)
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length < 8) {
    feedback.push('비밀번호는 최소 8자 이상이어야 합니다.')
    return { isValid: false, score: 0, feedback }
  }
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Character variety
  if (!/[A-Z]/.test(password)) {
    feedback.push('대문자를 포함해야 합니다.')
  } else {
    score++
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('소문자를 포함해야 합니다.')
  } else {
    score++
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('숫자를 포함해야 합니다.')
  } else {
    score++
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('특수문자를 포함해야 합니다.')
  } else {
    score++
  }

  const isValid = feedback.length === 0
  
  if (isValid) {
    if (score <= 4) feedback.push('보통 강도의 비밀번호입니다.')
    else if (score <= 5) feedback.push('강한 비밀번호입니다.')
    else feedback.push('매우 강한 비밀번호입니다!')
  }

  return { isValid, score, feedback }
}

/**
 * Server-side password validation
 */
export async function validatePasswordOnServer(
  password: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('validate_password_strength', {
    password
  })

  return !error && data === true
}

// ============================================
// 4. SECURITY EVENT LOGGING
// ============================================

type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'password_changed'
  | 'password_reset_requested'
  | 'mfa_enabled'
  | 'suspicious_activity'
  | 'admin_action'
  | 'admin_action_blocked'
  | 'admin_action_failed'
  | 'data_export'
  | 'permission_change'

type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  eventData?: Record<string, any>,
  severity: SecuritySeverity = 'low',
  ipAddress?: string
): Promise<void> {
  const supabase = createClient()
  
  await supabase.rpc('log_security_event', {
    p_event_type: eventType,
    p_event_data: eventData,
    p_severity: severity,
    p_ip_address: ipAddress,
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
  })
}

// ============================================
// 5. ACCOUNT LOCKOUT MANAGEMENT
// ============================================

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('check_account_lockout', {
    p_user_id: userId
  })

  return !error && data === true
}

/**
 * Lock user account (admin only)
 */
export async function lockUserAccount(
  userId: string,
  reason: string,
  durationMinutes = 30
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase.rpc('lock_user_account', {
    p_user_id: userId,
    p_reason: reason,
    p_duration_minutes: durationMinutes
  })

  return !error
}

// ============================================
// 6. SUSPICIOUS ACTIVITY DETECTION
// ============================================

/**
 * Check for suspicious login activity
 */
export async function checkSuspiciousActivity(
  userId: string,
  ipAddress?: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('detect_suspicious_login', {
    p_user_id: userId,
    p_ip_address: ipAddress
  })

  return !error && data === true
}

// ============================================
// 7. SESSION MANAGEMENT
// ============================================

/**
 * Revoke all sessions for a user (after password reset)
 */
export async function revokeAllSessions(userId?: string): Promise<void> {
  const supabase = createClient()
  
  await supabase.rpc('revoke_all_user_sessions', {
    p_user_id: userId
  })
  
  // Also sign out current session
  await supabase.auth.signOut()
}

// ============================================
// 8. MFA STATUS CHECK
// ============================================

/**
 * Check if user has MFA enabled
 */
export async function checkMFAStatus(userId?: string): Promise<{
  hasMFA: boolean
  factorCount: number
}> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('check_mfa_status', {
    p_user_id: userId
  })

  if (error || !data) {
    return { hasMFA: false, factorCount: 0 }
  }

  const result = data as { has_mfa?: boolean; factor_count?: number }

  return {
    hasMFA: result.has_mfa ?? false,
    factorCount: result.factor_count ?? 0
  }
}

// ============================================
// 9. IP RESTRICTION CHECK
// ============================================

/**
 * Check if IP is allowed
 */
export async function checkIPRestriction(
  ipAddress: string
): Promise<'allowed' | 'blocked' | 'unknown'> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('check_ip_restriction', {
    p_ip_address: ipAddress
  })

  if (error || !data) {
    return 'unknown'
  }

  return data as 'allowed' | 'blocked'
}

// ============================================
// 10. USAGE EXAMPLES
// ============================================

/**
 * Example: Secure login flow
 */
export async function secureLogin(
  email: string,
  password: string,
  ipAddress?: string
): Promise<{
  success: boolean
  message: string
  requiresMFA?: boolean
}> {
  // 1. Check rate limit
  const rateLimit = await checkRateLimit('login', 5, 15, 30)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: rateLimit.message || '너무 많은 시도입니다.'
    }
  }

  // 2. Validate password strength (for new passwords)
  // const passwordCheck = validatePasswordStrength(password)
  // if (!passwordCheck.isValid) {
  //   return {
  //     success: false,
  //     message: passwordCheck.feedback.join(' ')
  //   }
  // }

  // 3. Attempt login
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    // Log failed attempt
    await logSecurityEvent(
      'login_failed',
      { email, error: error.message },
      'medium',
      ipAddress
    )

    return {
      success: false,
      message: '로그인에 실패했습니다.'
    }
  }

  // 4. Check for suspicious activity
  const authData = (data || {}) as { user?: { id?: string } | null }
  const userId = authData.user?.id || null

  if (!userId) {
    return {
      success: false,
      message: '사용자 정보를 확인할 수 없습니다.'
    }
  }
  const isSuspicious = await checkSuspiciousActivity(userId, ipAddress)
  
  if (isSuspicious) {
    // Log suspicious activity
    await logSecurityEvent(
      'suspicious_activity',
      { userId, email },
      'high',
      ipAddress
    )

    return {
      success: true,
      message: '추가 인증이 필요합니다.',
      requiresMFA: true
    }
  }

  // 5. Log successful login
  await logSecurityEvent(
    'login_success',
    { userId, email },
    'low',
    ipAddress
  )

  return {
    success: true,
    message: '로그인 성공'
  }
}

/**
 * Example: Password reset flow
 */
export async function securePasswordReset(
  email: string,
  ipAddress?: string
): Promise<{
  success: boolean
  message: string
}> {
  // 1. Check rate limit (stricter for password reset)
  const rateLimit = await checkRateLimit('password_reset', 3, 60, 60)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: rateLimit.message || '너무 많은 요청입니다. 나중에 다시 시도해주세요.'
    }
  }

  // 2. Send reset email
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`
  })

  // 3. Log the attempt (always log, even if user doesn't exist)
  await logSecurityEvent(
    'password_reset_requested',
    { email },
    'medium',
    ipAddress
  )

  // 4. Always return success (prevent user enumeration)
  return {
    success: true,
    message: '이메일이 등록되어 있다면 비밀번호 재설정 링크가 전송됩니다.'
  }
}

/**
 * Example: Admin action with full security
 */
export async function secureAdminAction(
  action: string,
  targetUserId: string,
  ipAddress?: string
): Promise<{
  success: boolean
  message: string
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      success: false,
      message: '인증이 필요합니다.'
    }
  }

  // 1. Comprehensive security check
  const securityCheck = await performSecurityCheck(
    user.id,
    ipAddress,
    'admin_action'
  )

  if (!securityCheck.allowed) {
    await logSecurityEvent(
      'admin_action_blocked',
      { action, targetUserId, reasons: securityCheck.reasons },
      'critical',
      ipAddress
    )

    return {
      success: false,
      message: securityCheck.reasons.join(', ')
    }
  }

  // 2. Check if MFA is required
  if (securityCheck.requiresMFA) {
    return {
      success: false,
      message: '이 작업을 수행하려면 2단계 인증이 필요합니다.'
    }
  }

  // 3. Perform the admin action (example)
  try {
    // Your admin action logic here
    
    // 4. Log the successful action
    await logSecurityEvent(
      'admin_action',
      { action, targetUserId, performedBy: user.id },
      'high',
      ipAddress
    )

    return {
      success: true,
      message: '작업이 성공적으로 완료되었습니다.'
    }
  } catch (error) {
    // 5. Log the failed action
    await logSecurityEvent(
      'admin_action_failed',
      { action, targetUserId, error: String(error) },
      'high',
      ipAddress
    )

    return {
      success: false,
      message: '작업 수행 중 오류가 발생했습니다.'
    }
  }
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export const Security = {
  checkRateLimit,
  performSecurityCheck,
  validatePasswordStrength,
  validatePasswordOnServer,
  logSecurityEvent,
  isAccountLocked,
  lockUserAccount,
  checkSuspiciousActivity,
  revokeAllSessions,
  checkMFAStatus,
  checkIPRestriction,
  secureLogin,
  securePasswordReset,
  secureAdminAction
}
