const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Mock static file imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__tests__/mocks/fileMock.js',
    
    // Mock Redis for tests
    '^redis$': '<rootDir>/src/__tests__/mocks/redis.js',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/src/__tests__/mocks/',
    '<rootDir>/src/__tests__/utils/'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/app/globals.css',
    '!src/app/layout.tsx',
    '!src/app/providers.tsx',
    '!src/__tests__/**',
    '!src/**/types.ts',
    '!src/**/constants.ts',
    // Exclude auto-generated files
    '!src/lib/supabase/types.ts'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Stricter requirements for security modules
    './src/lib/security/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Stricter requirements for performance modules
    './src/lib/performance/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Stricter requirements for admin components
    './src/app/admin/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  // Test timeout for performance tests
  testTimeout: 15000,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)