import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path',
}))

// Mock window.location methods
delete window.location
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  hash: '',
  search: '',
  pathname: '/',
  assign: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
}

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock setTimeout and clearTimeout
global.setTimeout = jest.fn((cb) => cb())
global.clearTimeout = jest.fn()

// Mock Date.now for consistent testing
const mockDateNow = jest.fn(() => 1640995200000) // Fixed timestamp: Jan 1, 2022
Date.now = mockDateNow