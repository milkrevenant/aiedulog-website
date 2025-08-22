import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'

// Create a theme for testing
const theme = createTheme()

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockSession = (overrides = {}) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: createMockUser(),
  ...overrides,
})

export const createMockAuthError = (message: string, code?: string) => ({
  message,
  code,
  status: 400,
})

// Mock router utilities
export const mockPush = jest.fn()
export const mockReplace = jest.fn()
export const mockBack = jest.fn()

export const createMockRouter = (overrides = {}) => ({
  push: mockPush,
  replace: mockReplace,
  back: mockBack,
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  ...overrides,
})

// Mock search params
export const createMockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value)
  })
  return {
    get: (key: string) => searchParams.get(key),
    has: (key: string) => searchParams.has(key),
    getAll: (key: string) => searchParams.getAll(key),
    keys: () => searchParams.keys(),
    values: () => searchParams.values(),
    entries: () => searchParams.entries(),
    toString: () => searchParams.toString(),
  }
}

// Reset mocks utility
export const resetAllMocks = () => {
  mockPush.mockClear()
  mockReplace.mockClear()
  mockBack.mockClear()
}