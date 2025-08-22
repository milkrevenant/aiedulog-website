import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import ResetPasswordPage from '../page'
import {
  mockSupabaseAuth,
  resetSupabaseMocks,
  mockPasswordResetSuccess,
  mockPasswordResetError,
  mockSessionSuccess,
  mockSessionExpired,
  mockUpdateUserSuccess,
  mockUpdateUserError,
} from '@/__tests__/mocks/supabase'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock error translator
jest.mock('@/lib/utils/errorTranslator', () => ({
  translateAuthError: jest.fn((error) => error.message || error),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
}

describe('ResetPasswordPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    resetSupabaseMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })

    // Reset Date.now mock
    const fixedTime = 1640995200000 // Jan 1, 2022
    jest.spyOn(Date, 'now').mockImplementation(() => fixedTime)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Request Mode (Default)', () => {
    beforeEach(() => {
      mockSearchParams.get.mockReturnValue(null) // No mode parameter
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionExpired)
    })

    it('renders password reset request form', async () => {
      render(<ResetPasswordPage />)

      await waitFor(() => {
        expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument()
        expect(screen.getByText('가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.')).toBeInTheDocument()
        expect(screen.getByLabelText('이메일')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '재설정 링크 받기' })).toBeInTheDocument()
      })
    })

    it('shows validation error for empty email', async () => {
      render(<ResetPasswordPage />)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })
        expect(submitButton).toBeDisabled()
      })
    })

    it('enables submit button when email is entered', async () => {
      render(<ResetPasswordPage />)

      const emailInput = await screen.findByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })

      await user.type(emailInput, 'test@example.com')

      await waitFor(() => {
        expect(submitButton).toBeEnabled()
      })
    })

    it('successfully sends password reset email', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(mockPasswordResetSuccess)

      render(<ResetPasswordPage />)

      const emailInput = await screen.findByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
          redirectTo: 'http://localhost:3000/auth/callback',
        })
        expect(screen.getByText('비밀번호 재설정 링크를 이메일로 전송했습니다. 이메일을 확인해주세요.')).toBeInTheDocument()
      })

      // Email field should be cleared after success
      expect(emailInput).toHaveValue('')
    })

    it('shows error when password reset fails', async () => {
      const errorMessage = 'Invalid email address'
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(mockPasswordResetError(errorMessage))

      render(<ResetPasswordPage />)

      const emailInput = await screen.findByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('enforces rate limiting - 3 requests per minute', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(mockPasswordResetSuccess)

      render(<ResetPasswordPage />)

      const emailInput = await screen.findByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })

      await user.type(emailInput, 'test@example.com')

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        await user.click(submitButton)
        await waitFor(() => {
          expect(screen.getByText('비밀번호 재설정 링크를 이메일로 전송했습니다. 이메일을 확인해주세요.')).toBeInTheDocument()
        })
      }

      // 4th request should be rate limited
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('너무 많은 요청입니다. 1분 후에 다시 시도해주세요.')).toBeInTheDocument()
      })

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledTimes(3)
    })

    it('resets rate limit after 1 minute', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(mockPasswordResetSuccess)

      render(<ResetPasswordPage />)

      const emailInput = await screen.findByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })

      await user.type(emailInput, 'test@example.com')

      // Make 3 requests to hit rate limit
      for (let i = 0; i < 3; i++) {
        await user.click(submitButton)
        await waitFor(() => {
          expect(screen.getByText('비밀번호 재설정 링크를 이메일로 전송했습니다. 이메일을 확인해주세요.')).toBeInTheDocument()
        })
      }

      // Simulate time passing (more than 1 minute)
      const newTime = Date.now() + 61000
      jest.spyOn(Date, 'now').mockImplementation(() => newTime)

      // Should be able to make request again
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledTimes(4)
      })
    })

    it('has back to login link', async () => {
      render(<ResetPasswordPage />)

      await waitFor(() => {
        const backLink = screen.getByText('로그인으로 돌아가기')
        expect(backLink.closest('a')).toHaveAttribute('href', '/auth/login')
      })
    })

    it('has signup link for users without account', async () => {
      render(<ResetPasswordPage />)

      await waitFor(() => {
        const signupLink = screen.getByText('새로 가입하기')
        expect(signupLink.closest('a')).toHaveAttribute('href', '/auth/signup')
      })
    })
  })

  describe('Update Mode', () => {
    beforeEach(() => {
      mockSearchParams.get.mockImplementation((key) => {
        if (key === 'mode') return 'update'
        return null
      })
    })

    it('shows loading state while checking session', () => {
      mockSupabaseAuth.getSession.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<ResetPasswordPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('renders password update form when session is valid', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)

      render(<ResetPasswordPage />)

      await waitFor(() => {
        expect(screen.getByText('새 비밀번호 설정')).toBeInTheDocument()
        expect(screen.getByText('새로운 비밀번호를 입력해주세요.')).toBeInTheDocument()
        expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument()
        expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument()
      })
    })

    it('redirects to request mode when session is invalid', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionExpired)

      render(<ResetPasswordPage />)

      await waitFor(() => {
        expect(screen.getByText('세션이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.')).toBeInTheDocument()
        expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument() // Should switch to request mode
      })
    })

    it('shows password requirements helper text', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)

      render(<ResetPasswordPage />)

      await waitFor(() => {
        expect(screen.getByText('최소 6자 이상 입력해주세요')).toBeInTheDocument()
      })
    })

    it('shows password mismatch error in real-time', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')

      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different')

      await waitFor(() => {
        expect(screen.getByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument()
      })
    })

    it('disables submit button when passwords do not match', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')
      const submitButton = screen.getByRole('button', { name: '비밀번호 변경' })

      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different')

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('validates minimum password length', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')
      const submitButton = screen.getByRole('button', { name: '비밀번호 변경' })

      await user.type(passwordInput, '12345') // Only 5 characters
      await user.type(confirmPasswordInput, '12345')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('비밀번호는 최소 6자 이상이어야 합니다.')).toBeInTheDocument()
      })
    })

    it('successfully updates password and redirects', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)
      mockSupabaseAuth.updateUser.mockResolvedValue(mockUpdateUserSuccess)
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null })

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')
      const submitButton = screen.getByRole('button', { name: '비밀번호 변경' })

      await user.type(passwordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
          password: 'newpassword123',
        })
        expect(screen.getByText('비밀번호가 성공적으로 변경되었습니다.')).toBeInTheDocument()
      })

      // Should sign out and redirect after delay
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled()
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000)
    })

    it('re-validates session before updating password', async () => {
      // Mock session valid initially, then expired on second check
      mockSupabaseAuth.getSession
        .mockResolvedValueOnce(mockSessionSuccess)
        .mockResolvedValueOnce(mockSessionExpired)

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')
      const submitButton = screen.getByRole('button', { name: '비밀번호 변경' })

      await user.type(passwordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('세션이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.')).toBeInTheDocument()
        expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument() // Should switch back to request mode
      })

      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled()
    })

    it('shows error when password update fails', async () => {
      const errorMessage = 'Password update failed'
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)
      mockSupabaseAuth.updateUser.mockResolvedValue(mockUpdateUserError(errorMessage))

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')
      const submitButton = screen.getByRole('button', { name: '비밀번호 변경' })

      await user.type(passwordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('toggles password visibility', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(mockSessionSuccess)

      render(<ResetPasswordPage />)

      const passwordInput = await screen.findByLabelText('새 비밀번호')
      const confirmPasswordInput = await screen.findByLabelText('새 비밀번호 확인')
      
      // Find visibility toggle buttons
      const visibilityButtons = screen.getAllByRole('button', { name: '' }) // Icon buttons typically have no text
      const passwordToggle = visibilityButtons.find(btn => 
        btn.closest('div')?.contains(passwordInput)
      )
      const confirmPasswordToggle = visibilityButtons.find(btn => 
        btn.closest('div')?.contains(confirmPasswordInput)
      )

      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      if (passwordToggle) {
        await user.click(passwordToggle)
        expect(passwordInput).toHaveAttribute('type', 'text')
      }

      if (confirmPasswordToggle) {
        await user.click(confirmPasswordToggle)
        expect(confirmPasswordInput).toHaveAttribute('type', 'text')
      }
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', async () => {
      render(<ResetPasswordPage />)

      await waitFor(() => {
        const emailInput = screen.getByLabelText('이메일')
        expect(emailInput).toHaveAttribute('type', 'email')
        expect(emailInput).toHaveAttribute('required')
        expect(emailInput).toHaveAttribute('autoComplete', 'email')
      })
    })

    it('focuses first input on load', async () => {
      render(<ResetPasswordPage />)

      await waitFor(() => {
        const emailInput = screen.getByLabelText('이메일')
        expect(emailInput).toHaveAttribute('autoFocus')
      })
    })

    it('provides clear error messages with proper ARIA roles', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(mockPasswordResetError('Test error'))

      render(<ResetPasswordPage />)

      const emailInput = await screen.findByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: '재설정 링크 받기' })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toHaveTextContent('Test error')
      })
    })
  })
})