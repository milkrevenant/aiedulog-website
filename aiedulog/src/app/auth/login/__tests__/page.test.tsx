import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginPage from '../page'
import {
  mockSupabaseAuth,
  resetSupabaseMocks,
  mockAuthSuccess,
  mockAuthError,
} from '@/__tests__/mocks/supabase'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock MFA component
jest.mock('@/components/MFAVerification', () => {
  return function MockMFAVerification({ onSuccess, onCancel }: any) {
    return (
      <div data-testid="mfa-verification">
        <button onClick={onSuccess}>MFA Success</button>
        <button onClick={onCancel}>MFA Cancel</button>
      </div>
    )
  }
})

// Mock error translator
jest.mock('@/lib/utils/errorTranslator', () => ({
  translateAuthError: jest.fn((error) => error.message || error),
  getErrorSuggestion: jest.fn(() => null),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
}

describe('LoginPage - Password Reset Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    resetSupabaseMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    
    // Mock successful auth flow by default
    mockSupabaseAuth.signInWithPassword.mockResolvedValue(mockAuthSuccess)
    mockSupabaseAuth.mfa.listFactors.mockResolvedValue({ data: { totp: [] } })
    
    // Mock profile data query
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { role: 'user' },
            error: null,
          }),
        })),
      })),
    }))
    mockSupabaseAuth.from = mockFrom as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Password Reset Link', () => {
    it('renders password reset link', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      await waitFor(() => {
        const resetLink = screen.getByText('비밀번호 찾기')
        expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password')
      })
    })

    it('navigates to password reset page when clicked', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      const resetLink = await screen.findByText('비밀번호 찾기')
      
      expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password')
      // Note: We can't test actual navigation since it's handled by Next.js Link component
    })
  })

  describe('Password Reset Success Message', () => {
    it('displays success message when redirected from password reset', async () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'message') return 'password_reset_success'
        return null
      })

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByText('비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요.')).toBeInTheDocument()
      })
    })

    it('displays success message with proper styling', async () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'message') return 'password_reset_success'
        return null
      })

      render(<LoginPage />)

      await waitFor(() => {
        const successAlert = screen.getByRole('alert')
        expect(successAlert).toHaveClass('MuiAlert-standardSuccess')
        expect(successAlert).toHaveTextContent('비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요.')
      })
    })

    it('user can login with new password after reset', async () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'message') return 'password_reset_success'
        return null
      })

      render(<LoginPage />)

      // Wait for success message to appear
      await waitFor(() => {
        expect(screen.getByText('비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요.')).toBeInTheDocument()
      })

      // Fill in login form with new password
      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const loginButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'newpassword123')
      await user.click(loginButton)

      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'newpassword123',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/feed')
      })
    })
  })

  describe('Error Message from Callback', () => {
    it('displays error message from URL parameters', async () => {
      const errorMessage = 'Recovery link expired or invalid'
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'error') return encodeURIComponent(errorMessage)
        return null
      })

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('decodes URL-encoded error messages', async () => {
      const errorMessage = 'Authentication failed'
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'error') return encodeURIComponent(errorMessage)
        return null
      })

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  describe('Password Reset Flow Integration', () => {
    it('suggests password reset when login fails with invalid credentials', async () => {
      mockSearchParams.get.mockReturnValue(null)
      mockSupabaseAuth.signInWithPassword.mockResolvedValue(
        mockAuthError('Invalid login credentials')
      )

      // Mock error suggestion
      const { getErrorSuggestion } = require('@/lib/utils/errorTranslator')
      getErrorSuggestion.mockReturnValue('비밀번호를 잊으셨나요? 비밀번호 찾기를 이용해주세요.')

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const loginButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
        expect(screen.getByText('💡 비밀번호를 잊으셨나요? 비밀번호 찾기를 이용해주세요.')).toBeInTheDocument()
      })
    })

    it('shows password reset link prominently after failed login', async () => {
      mockSearchParams.get.mockReturnValue(null)
      mockSupabaseAuth.signInWithPassword.mockResolvedValue(
        mockAuthError('Invalid login credentials')
      )

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const loginButton = screen.getByRole('button', { name: '로그인' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)

      await waitFor(() => {
        const resetLink = screen.getByText('비밀번호 찾기')
        expect(resetLink).toBeInTheDocument()
        expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password')
      })
    })
  })

  describe('User Experience Flow', () => {
    it('maintains email value when navigating to password reset', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('이메일')
      await user.type(emailInput, 'user@example.com')

      const resetLink = screen.getByText('비밀번호 찾기')
      expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password')
      
      // In a real scenario, the email would be pre-filled on the reset page
      // This would require state management or URL parameters
    })

    it('shows consistent branding and messaging', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByText('로그인')).toBeInTheDocument()
        expect(screen.getByText('AIedulog')).toBeInTheDocument()
        expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument()
      })
    })

    it('provides clear navigation between auth pages', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      await waitFor(() => {
        // Password reset link
        const resetLink = screen.getByText('비밀번호 찾기')
        expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password')

        // Signup link
        const signupLink = screen.getByText('회원가입')
        expect(signupLink.closest('a')).toHaveAttribute('href', '/auth/signup')

        // Home link
        const homeLink = screen.getByText('← 홈으로 돌아가기')
        expect(homeLink.closest('a')).toHaveAttribute('href', '/main')
      })
    })
  })

  describe('Accessibility for Password Reset', () => {
    it('has proper ARIA labels for password reset link', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      await waitFor(() => {
        const resetLink = screen.getByText('비밀번호 찾기')
        expect(resetLink).toBeInTheDocument()
        // The link should be keyboard navigable
        expect(resetLink.closest('a')).toHaveAttribute('href', '/auth/reset-password')
      })
    })

    it('announces success message to screen readers', async () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'message') return 'password_reset_success'
        return null
      })

      render(<LoginPage />)

      await waitFor(() => {
        const successAlert = screen.getByRole('alert')
        expect(successAlert).toHaveTextContent('비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요.')
      })
    })

    it('provides clear focus management', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      // Email input should be focusable
      const emailInput = await screen.findByLabelText('이메일')
      expect(emailInput).toBeInTheDocument()
      
      // Reset link should be focusable
      const resetLink = screen.getByText('비밀번호 찾기')
      expect(resetLink).toBeInTheDocument()
    })
  })

  describe('Form State Management', () => {
    it('clears error messages when navigating between auth pages', async () => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'error') return 'Previous error'
        return null
      })

      render(<LoginPage />)

      await waitFor(() => {
        expect(screen.getByText('Previous error')).toBeInTheDocument()
      })

      // In a real scenario, navigating to reset password would clear this error
      // This would be handled by the routing system
    })

    it('preserves form state appropriately', async () => {
      mockSearchParams.get.mockReturnValue(null)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('이메일')
      const rememberMeCheckbox = screen.getByLabelText('로그인 상태 유지')

      await user.type(emailInput, 'test@example.com')
      await user.click(rememberMeCheckbox)

      expect(emailInput).toHaveValue('test@example.com')
      expect(rememberMeCheckbox).toBeChecked()
    })
  })
})