import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import AuthCallbackPage from '../page'
import {
  mockSupabaseAuth,
  resetSupabaseMocks,
  mockAuthSuccess,
  mockAuthError,
} from '@/__tests__/mocks/supabase'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}

describe('AuthCallbackPage', () => {
  const setLocation = (hash = '', search = '') => {
    window.location.hash = hash
    window.location.search = search
  }

  beforeEach(() => {
    jest.clearAllMocks()
    resetSupabaseMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Reset location
    setLocation()
    
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Password Recovery Flow', () => {
    beforeEach(() => {
      // Mock window.location with recovery token in hash
      setLocation('#access_token=recovery-token&refresh_token=refresh-token&token_type=bearer&type=recovery')
    })

    it('renders loading state initially', () => {
      render(<AuthCallbackPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText('인증 처리 중...')).toBeInTheDocument()
    })

    it('successfully processes recovery token and redirects to password reset', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
          access_token: 'recovery-token',
          refresh_token: 'refresh-token',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/reset-password?mode=update')
      })
    })

    it('handles expired recovery token', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({
        error: { message: 'Invalid token' }
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/auth/login?error=Recovery%20link%20expired%20or%20invalid'
        )
      })
    })

    it('processes tokens from query parameters (fallback)', async () => {
      // Mock URL with tokens in query params instead of hash
      setLocation('', '?access_token=recovery-token&refresh_token=refresh-token&token_type=bearer&type=recovery')

      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
          access_token: 'recovery-token',
          refresh_token: 'refresh-token',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/reset-password?mode=update')
      })
    })

    it('handles missing refresh token gracefully', async () => {
      setLocation('#access_token=recovery-token&token_type=bearer&type=recovery')

      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
          access_token: 'recovery-token',
          refresh_token: '',
        })
      })
    })
  })

  describe('Email Confirmation Flow', () => {
    beforeEach(() => {
      setLocation('#access_token=signup-token&refresh_token=refresh-token&token_type=bearer&type=signup')
    })

    it('successfully processes email confirmation and redirects to dashboard', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
          access_token: 'signup-token',
          refresh_token: 'refresh-token',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles email confirmation failure', async () => {
      mockSupabaseAuth.setSession.mockResolvedValue({
        error: { message: 'Email verification failed' }
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?error=Email verification failed')
      })
    })
  })

  describe('OAuth Flow', () => {
    beforeEach(() => {
      setLocation('', '?code=oauth-code')
    })

    it('successfully processes OAuth code and redirects to dashboard', async () => {
      mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles OAuth code exchange failure', async () => {
      mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
        error: { message: 'Invalid authorization code' }
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?error=Login failed')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles error in URL hash parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#error=access_denied&error_description=User%20denied%20access',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/auth/login?error=User%20denied%20access'
        )
      })
    })

    it('handles error in URL query parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '',
          search: '?error=invalid_request&error_description=Invalid%20request',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/auth/login?error=Invalid%20request'
        )
      })
    })

    it('falls back to error code when description is missing', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#error=access_denied',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/auth/login?error=access_denied'
        )
      })
    })

    it('handles generic authentication failure', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#error=unknown_error',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/auth/login?error=unknown_error'
        )
      })
    })

    it('handles unexpected errors during callback processing', async () => {
      // Mock an error during URL parsing
      Object.defineProperty(window, 'location', {
        get: () => {
          throw new Error('URL parsing error')
        },
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?error=An error occurred')
      })
    })
  })

  describe('Invalid Callback Scenarios', () => {
    it('redirects to login when no valid callback parameters found', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('handles missing access token for recovery', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#token_type=bearer&type=recovery',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('handles missing access token for email confirmation', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#token_type=bearer&type=signup',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })
  })

  describe('Security Considerations', () => {
    it('does not expose tokens in console logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log')
      
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#access_token=secret-token&refresh_token=secret-refresh&type=recovery',
          search: '',
        },
        writable: true,
      })

      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalled()
      })

      // Ensure tokens are not logged
      const logCalls = consoleSpy.mock.calls.flat()
      expect(logCalls.some(call => String(call).includes('secret-token'))).toBe(false)
      expect(logCalls.some(call => String(call).includes('secret-refresh'))).toBe(false)
    })

    it('properly handles malformed URL parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#access_token=&refresh_token=&type=recovery',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('validates token types', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#access_token=token&type=invalid_type',
          search: '',
        },
        writable: true,
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })
  })

  describe('URL Parameter Parsing', () => {
    it('prioritizes hash parameters over query parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#access_token=hash-token&type=recovery',
          search: '?access_token=query-token&type=signup',
        },
        writable: true,
      })

      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
          access_token: 'hash-token',
          refresh_token: '',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/reset-password?mode=update')
      })
    })

    it('handles URL-encoded parameters correctly', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          hash: '#access_token=token%20with%20spaces&type=recovery',
          search: '',
        },
        writable: true,
      })

      mockSupabaseAuth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
          access_token: 'token with spaces',
          refresh_token: '',
        })
      })
    })
  })
})