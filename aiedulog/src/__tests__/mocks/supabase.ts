// Mock Supabase client and auth methods
export const mockSupabaseAuth = {
  getSession: jest.fn(),
  setSession: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  mfa: {
    listFactors: jest.fn(),
  },
}

export const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
}

// Mock the createClient function
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Reset all mocks
export const resetSupabaseMocks = () => {
  Object.values(mockSupabaseAuth).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockClear()
    }
  })
  mockSupabaseAuth.mfa.listFactors.mockClear()
  mockSupabaseClient.from.mockClear()
}

// Common mock responses
export const mockAuthSuccess = {
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    },
  },
  error: null,
}

export const mockAuthError = (message: string) => ({
  data: { user: null, session: null },
  error: { message, code: 'auth_error' },
})

export const mockSessionSuccess = {
  data: {
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    },
  },
  error: null,
}

export const mockSessionExpired = {
  data: { session: null },
  error: null,
}

export const mockPasswordResetSuccess = {
  data: {},
  error: null,
}

export const mockPasswordResetError = (message: string) => ({
  data: {},
  error: { message, code: 'password_reset_error' },
})

export const mockUpdateUserSuccess = {
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  },
  error: null,
}

export const mockUpdateUserError = (message: string) => ({
  data: { user: null },
  error: { message, code: 'update_error' },
})