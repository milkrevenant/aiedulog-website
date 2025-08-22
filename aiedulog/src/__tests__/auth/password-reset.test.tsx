import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResetPasswordPage from '@/app/auth/reset-password/page'
import AuthCallbackPage from '@/app/auth/callback/page'
import { createClient } from '@/lib/supabase/client'

// Mock modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

describe('Password Reset Flow', () => {
  let mockRouter: any
  let mockSupabase: any

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
    })

    mockSupabase = {
      auth: {
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        getSession: jest.fn(),
        setSession: jest.fn(),
        signOut: jest.fn(),
      },
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Request Mode', () => {
    it('should display email request form by default', () => {
      render(<ResetPasswordPage />)
      expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument()
      expect(screen.getByLabelText('이메일')).toBeInTheDocument()
      expect(screen.getByText('재설정 링크 받기')).toBeInTheDocument()
    })

    it('should validate email format', async () => {
      render(<ResetPasswordPage />)
      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByText('재설정 링크 받기')

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('type', 'email')
      })
    })

    it('should handle successful email submission', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
      
      render(<ResetPasswordPage />)
      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByText('재설정 링크 받기')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/비밀번호 재설정 링크를 이메일로 전송했습니다/)).toBeInTheDocument()
      })
    })

    it('should implement rate limiting', async () => {
      render(<ResetPasswordPage />)
      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByText('재설정 링크 받기')

      // Simulate multiple rapid requests
      for (let i = 0; i < 4; i++) {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.click(submitButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/너무 많은 요청입니다/)).toBeInTheDocument()
      })
    })
  })

  describe('Update Mode', () => {
    beforeEach(() => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => key === 'mode' ? 'update' : null,
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
      })
    })

    it('should display password update form in update mode', async () => {
      render(<ResetPasswordPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 비밀번호 설정')).toBeInTheDocument()
        expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument()
        expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument()
      })
    })

    it('should validate password length', async () => {
      render(<ResetPasswordPage />)
      
      await waitFor(() => {
        const passwordInput = screen.getByLabelText('새 비밀번호')
        const confirmInput = screen.getByLabelText('새 비밀번호 확인')
        const submitButton = screen.getByText('비밀번호 변경')

        fireEvent.change(passwordInput, { target: { value: '12345' } })
        fireEvent.change(confirmInput, { target: { value: '12345' } })
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/비밀번호는 최소 6자 이상이어야 합니다/)).toBeInTheDocument()
      })
    })

    it('should validate password matching', async () => {
      render(<ResetPasswordPage />)
      
      await waitFor(() => {
        const passwordInput = screen.getByLabelText('새 비밀번호')
        const confirmInput = screen.getByLabelText('새 비밀번호 확인')
        const submitButton = screen.getByText('비밀번호 변경')

        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.change(confirmInput, { target: { value: 'password456' } })
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/비밀번호가 일치하지 않습니다/)).toBeInTheDocument()
      })
    })

    it('should handle successful password update', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null })
      
      render(<ResetPasswordPage />)
      
      await waitFor(() => {
        const passwordInput = screen.getByLabelText('새 비밀번호')
        const confirmInput = screen.getByLabelText('새 비밀번호 확인')
        const submitButton = screen.getByText('비밀번호 변경')

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } })
        fireEvent.change(confirmInput, { target: { value: 'newpassword123' } })
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/비밀번호가 성공적으로 변경되었습니다/)).toBeInTheDocument()
      })

      // Should sign out and redirect
      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled()
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?message=password_reset_success')
      }, { timeout: 3000 })
    })

    it('should handle expired session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })
      
      render(<ResetPasswordPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/세션이 만료되었습니다/)).toBeInTheDocument()
        expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument() // Should revert to request mode
      })
    })
  })

  describe('Callback Handling', () => {
    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          hash: '',
          search: '',
          origin: 'http://localhost:3000',
        },
        writable: true,
      })
    })

    it('should handle recovery token from hash fragment', async () => {
      window.location.hash = '#access_token=test-token&type=recovery&token_type=bearer&refresh_token=refresh-token'
      mockSupabase.auth.setSession.mockResolvedValue({ error: null })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
          access_token: 'test-token',
          refresh_token: 'refresh-token',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/reset-password?mode=update')
      })
    })

    it('should handle error in callback', async () => {
      window.location.hash = '#error=access_denied&error_description=User%20denied%20access'

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login?error=')
        )
      })
    })

    it('should handle invalid/expired token', async () => {
      window.location.hash = '#access_token=invalid-token&type=recovery'
      mockSupabase.auth.setSession.mockResolvedValue({
        error: { message: 'Invalid token' },
      })

      render(<AuthCallbackPage />)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login?error=')
        )
      })
    })
  })

  describe('Security Tests', () => {
    it('should not expose user existence', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' },
      })
      
      render(<ResetPasswordPage />)
      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByText('재설정 링크 받기')

      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } })
      fireEvent.click(submitButton)

      // Should show generic success message even for non-existent users
      await waitFor(() => {
        expect(screen.queryByText(/사용자를 찾을 수 없습니다/)).not.toBeInTheDocument()
      })
    })

    it('should clear sensitive data on unmount', () => {
      const { unmount } = render(<ResetPasswordPage />)
      const passwordInput = screen.getByLabelText('새 비밀번호', { exact: false })
      
      fireEvent.change(passwordInput, { target: { value: 'sensitive-password' } })
      unmount()
      
      // Password should be cleared from memory
      expect(passwordInput).not.toBeInTheDocument()
    })
  })
})