import { translateAuthError, getErrorSuggestion } from '../errorTranslator'

describe('translateAuthError', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Password Reset Related Errors', () => {
    it('translates token expired error', () => {
      const result = translateAuthError('Token expired')
      expect(result).toBe('인증 토큰이 만료되었습니다. 다시 요청해주세요.')
    })

    it('translates invalid token error', () => {
      const result = translateAuthError('Invalid token')
      expect(result).toBe('유효하지 않은 토큰입니다.')
    })

    it('translates invalid recovery link error', () => {
      const result = translateAuthError('Invalid recovery link')
      expect(result).toBe('유효하지 않은 복구 링크입니다.')
    })

    it('translates email rate limit exceeded error', () => {
      const result = translateAuthError('Email rate limit exceeded')
      expect(result).toBe('너무 많은 이메일 요청입니다. 잠시 후 다시 시도해주세요.')
    })

    it('translates password reset required error', () => {
      const result = translateAuthError('Password reset required')
      expect(result).toBe('비밀번호 재설정이 필요합니다.')
    })

    it('translates password updated successfully message', () => {
      const result = translateAuthError('Password updated successfully')
      expect(result).toBe('비밀번호가 성공적으로 변경되었습니다.')
    })
  })

  describe('Login Credential Errors', () => {
    it('translates invalid login credentials', () => {
      const result = translateAuthError('Invalid login credentials')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('translates invalid credentials (short form)', () => {
      const result = translateAuthError('Invalid credentials')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('translates lowercase invalid credentials', () => {
      const result = translateAuthError('invalid credentials')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('translates user not found error', () => {
      const result = translateAuthError('User not found')
      expect(result).toBe('등록되지 않은 사용자입니다.')
    })

    it('translates invalid email or password', () => {
      const result = translateAuthError('Invalid email or password')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })
  })

  describe('Session and Auth Errors', () => {
    it('translates session expired error', () => {
      const result = translateAuthError('Session expired')
      expect(result).toBe('세션이 만료되었습니다. 다시 로그인해주세요.')
    })

    it('translates invalid session error', () => {
      const result = translateAuthError('Invalid session')
      expect(result).toBe('유효하지 않은 세션입니다. 다시 로그인해주세요.')
    })

    it('translates refresh token expired', () => {
      const result = translateAuthError('Refresh token expired')
      expect(result).toBe('세션이 만료되었습니다. 다시 로그인해주세요.')
    })
  })

  describe('Email Verification Errors', () => {
    it('translates email not confirmed', () => {
      const result = translateAuthError('Email not confirmed')
      expect(result).toBe('이메일 인증이 필요합니다. 이메일을 확인해주세요.')
    })

    it('translates email link expired', () => {
      const result = translateAuthError('Email link expired')
      expect(result).toBe('이메일 링크가 만료되었습니다. 새로운 링크를 요청해주세요.')
    })

    it('translates invalid verification link', () => {
      const result = translateAuthError('Invalid verification link')
      expect(result).toBe('유효하지 않은 인증 링크입니다.')
    })

    it('translates email already confirmed', () => {
      const result = translateAuthError('Email already confirmed')
      expect(result).toBe('이미 인증된 이메일입니다.')
    })
  })

  describe('Rate Limiting Errors', () => {
    it('translates too many requests', () => {
      const result = translateAuthError('Too many requests')
      expect(result).toBe('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.')
    })

    it('translates rate limit exceeded', () => {
      const result = translateAuthError('Rate limit exceeded')
      expect(result).toBe('요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.')
    })
  })

  describe('Network Errors', () => {
    it('translates failed to fetch', () => {
      const result = translateAuthError('Failed to fetch')
      expect(result).toBe('네트워크 연결을 확인해주세요.')
    })

    it('translates network request failed', () => {
      const result = translateAuthError('Network request failed')
      expect(result).toBe('네트워크 연결을 확인해주세요.')
    })

    it('translates no internet connection', () => {
      const result = translateAuthError('No internet connection')
      expect(result).toBe('인터넷 연결을 확인해주세요.')
    })
  })

  describe('Error Object Handling', () => {
    it('handles error objects with message property', () => {
      const error = { message: 'Invalid login credentials' }
      const result = translateAuthError(error)
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('handles error objects with error_description property', () => {
      const error = { error_description: 'Token expired' }
      const result = translateAuthError(error)
      expect(result).toBe('인증 토큰이 만료되었습니다. 다시 요청해주세요.')
    })

    it('handles error objects with error property', () => {
      const error = { error: 'Invalid credentials' }
      const result = translateAuthError(error)
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('handles Error instances', () => {
      const error = new Error('Session expired')
      const result = translateAuthError(error)
      expect(result).toBe('세션이 만료되었습니다. 다시 로그인해주세요.')
    })
  })

  describe('Case Insensitive Matching', () => {
    it('handles uppercase error messages', () => {
      const result = translateAuthError('INVALID LOGIN CREDENTIALS')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('handles mixed case error messages', () => {
      const result = translateAuthError('Invalid Login Credentials')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })
  })

  describe('Partial Matching', () => {
    it('matches partial strings for credentials', () => {
      const result = translateAuthError('Something about invalid credentials here')
      expect(result).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('matches partial strings for tokens', () => {
      const result = translateAuthError('The token has expired unfortunately')
      expect(result).toBe('인증 토큰이 만료되었습니다. 다시 요청해주세요.')
    })
  })

  describe('Special Cases and Fallbacks', () => {
    it('handles timeout errors', () => {
      const result = translateAuthError('Request timeout occurred')
      expect(result).toBe('요청 시간이 초과되었습니다. 다시 시도해주세요.')
    })

    it('provides default message for unknown errors', () => {
      const result = translateAuthError('Some completely unknown error')
      expect(result).toBe('요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    })

    it('handles empty string', () => {
      const result = translateAuthError('')
      expect(result).toBe('알 수 없는 오류가 발생했습니다.')
    })

    it('handles null/undefined', () => {
      const result1 = translateAuthError(null as any)
      const result2 = translateAuthError(undefined as any)
      expect(result1).toBe('알 수 없는 오류가 발생했습니다.')
      expect(result2).toBe('알 수 없는 오류가 발생했습니다.')
    })

    it('logs untranslated errors for debugging', () => {
      const consoleSpy = jest.spyOn(console, 'error')
      translateAuthError('Unknown specific error message')
      expect(consoleSpy).toHaveBeenCalledWith('Untranslated error:', 'Unknown specific error message')
    })
  })
})

describe('getErrorSuggestion', () => {
  describe('Password Reset Suggestions', () => {
    it('suggests password reset for credential errors', () => {
      const result = getErrorSuggestion('Invalid login credentials')
      expect(result).toBe('비밀번호를 잊으셨나요? 비밀번호 찾기를 이용해주세요.')
    })

    it('suggests password reset for password errors', () => {
      const result = getErrorSuggestion('Incorrect password provided')
      expect(result).toBe('비밀번호를 잊으셨나요? 비밀번호 찾기를 이용해주세요.')
    })
  })

  describe('Signup Suggestions', () => {
    it('suggests signup for email not found', () => {
      const result = getErrorSuggestion('Email not found in database')
      expect(result).toBe('아직 회원이 아니신가요? 회원가입을 진행해주세요.')
    })
  })

  describe('Email Verification Suggestions', () => {
    it('suggests checking email for confirmation errors', () => {
      const result = getErrorSuggestion('Email confirmation required')
      expect(result).toBe('가입 시 입력한 이메일의 받은편지함을 확인해주세요.')
    })
  })

  describe('Network Suggestions', () => {
    it('suggests checking connection for network errors', () => {
      const result = getErrorSuggestion('Network request failed')
      expect(result).toBe('인터넷 연결 상태를 확인하고 다시 시도해주세요.')
    })

    it('suggests checking connection for fetch errors', () => {
      const result = getErrorSuggestion('Failed to fetch data')
      expect(result).toBe('인터넷 연결 상태를 확인하고 다시 시도해주세요.')
    })
  })

  describe('Rate Limiting Suggestions', () => {
    it('suggests waiting for rate limit errors', () => {
      const result = getErrorSuggestion('Rate limit exceeded')
      expect(result).toBe('잠시 기다린 후 다시 시도해주세요.')
    })

    it('suggests waiting for too many requests', () => {
      const result = getErrorSuggestion('Too many requests sent')
      expect(result).toBe('잠시 기다린 후 다시 시도해주세요.')
    })
  })

  describe('No Suggestion Cases', () => {
    it('returns null for errors without specific suggestions', () => {
      const result = getErrorSuggestion('Some generic error')
      expect(result).toBeNull()
    })

    it('returns null for unknown error types', () => {
      const result = getErrorSuggestion('Database connection failed')
      expect(result).toBeNull()
    })

    it('handles empty strings', () => {
      const result = getErrorSuggestion('')
      expect(result).toBeNull()
    })
  })

  describe('Case Insensitive Suggestions', () => {
    it('works with uppercase errors', () => {
      const result = getErrorSuggestion('INVALID CREDENTIALS')
      expect(result).toBe('비밀번호를 잊으셨나요? 비밀번호 찾기를 이용해주세요.')
    })

    it('works with mixed case errors', () => {
      const result = getErrorSuggestion('Network Request Failed')
      expect(result).toBe('인터넷 연결 상태를 확인하고 다시 시도해주세요.')
    })
  })
})