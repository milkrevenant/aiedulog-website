/**
 * Error message translation utility for Korean users
 * Maps English error messages from Supabase to Korean
 */

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Login errors
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Invalid credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'invalid credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
  'User not found': '등록되지 않은 사용자입니다.',
  'Invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  
  // Signup errors
  'User already registered': '이미 등록된 이메일입니다.',
  'Email already registered': '이미 등록된 이메일입니다.',
  'Password should be at least': '비밀번호는 최소 6자 이상이어야 합니다.',
  'Invalid email': '올바른 이메일 형식이 아닙니다.',
  'Signups not allowed': '현재 회원가입이 제한되어 있습니다.',
  
  // MFA errors
  'Invalid MFA code': '인증 코드가 올바르지 않습니다.',
  'MFA code expired': '인증 코드가 만료되었습니다. 다시 시도해주세요.',
  
  // Network errors
  'Failed to fetch': '네트워크 연결을 확인해주세요.',
  'Network request failed': '네트워크 연결을 확인해주세요.',
  'No internet connection': '인터넷 연결을 확인해주세요.',
  
  // Session errors
  'Session expired': '세션이 만료되었습니다. 다시 로그인해주세요.',
  'Invalid session': '유효하지 않은 세션입니다. 다시 로그인해주세요.',
  'Refresh token expired': '세션이 만료되었습니다. 다시 로그인해주세요.',
  
  // Rate limiting
  'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  'Rate limit exceeded': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  
  // Email verification
  'Email link expired': '이메일 링크가 만료되었습니다. 새로운 링크를 요청해주세요.',
  'Invalid verification link': '유효하지 않은 인증 링크입니다.',
  'Email already confirmed': '이미 인증된 이메일입니다.',
  
  // Password reset
  'Password reset required': '비밀번호 재설정이 필요합니다.',
  'Invalid recovery link': '유효하지 않은 복구 링크입니다.',
  'Password recovery email sent': '비밀번호 재설정 이메일이 전송되었습니다.',
  'Token expired': '인증 토큰이 만료되었습니다. 다시 요청해주세요.',
  'Invalid token': '유효하지 않은 토큰입니다.',
  'Password updated successfully': '비밀번호가 성공적으로 변경되었습니다.',
  'Email rate limit exceeded': '너무 많은 이메일 요청입니다. 잠시 후 다시 시도해주세요.',
  
  // OAuth errors
  'OAuth error': '소셜 로그인 중 오류가 발생했습니다.',
  'Provider not found': '지원하지 않는 로그인 방식입니다.',
}

/**
 * Translates English error messages to Korean
 * @param error - The error message or error object
 * @returns Translated Korean error message
 */
export function translateAuthError(error: string | Error | any): string {
  let errorMessage = ''
  
  // Extract error message from different formats
  if (typeof error === 'string') {
    errorMessage = error
  } else if (error?.message) {
    errorMessage = error.message
  } else if (error?.error_description) {
    errorMessage = error.error_description
  } else if (error?.error) {
    errorMessage = error.error
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowerErrorMessage = errorMessage.toLowerCase()
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (lowerErrorMessage === key.toLowerCase()) {
      return value
    }
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (lowerErrorMessage.includes(key.toLowerCase())) {
      return value
    }
  }
  
  // Special cases
  if (lowerErrorMessage.includes('invalid') && lowerErrorMessage.includes('credential')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  
  if (lowerErrorMessage.includes('email') && lowerErrorMessage.includes('not found')) {
    return '등록되지 않은 이메일입니다.'
  }
  
  if (lowerErrorMessage.includes('password') && lowerErrorMessage.includes('incorrect')) {
    return '비밀번호가 올바르지 않습니다.'
  }
  
  if (lowerErrorMessage.includes('timeout')) {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.'
  }
  
  // Default fallback message
  if (errorMessage) {
    console.error('Untranslated error:', errorMessage)
    return '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * Provides helpful suggestions based on error type
 * @param error - The error message
 * @returns Suggestion text or null
 */
export function getErrorSuggestion(error: string): string | null {
  const lowerError = error.toLowerCase()
  
  if (lowerError.includes('credential') || lowerError.includes('password')) {
    return '비밀번호를 잊으셨나요? 비밀번호 찾기를 이용해주세요.'
  }
  
  if (lowerError.includes('email') && lowerError.includes('not found')) {
    return '아직 회원이 아니신가요? 회원가입을 진행해주세요.'
  }
  
  if (lowerError.includes('email') && lowerError.includes('confirm')) {
    return '가입 시 입력한 이메일의 받은편지함을 확인해주세요.'
  }
  
  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return '인터넷 연결 상태를 확인하고 다시 시도해주세요.'
  }
  
  if (lowerError.includes('rate') || lowerError.includes('too many')) {
    return '잠시 기다린 후 다시 시도해주세요.'
  }
  
  return null
}