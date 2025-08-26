// Mock Redis client for testing
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  
  // String operations
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  
  // Number operations  
  incr: jest.fn().mockResolvedValue(1),
  incrBy: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(1),
  decrBy: jest.fn().mockResolvedValue(1),
  
  // Hash operations
  hGet: jest.fn().mockResolvedValue(null),
  hSet: jest.fn().mockResolvedValue(1),
  hDel: jest.fn().mockResolvedValue(1),
  hExists: jest.fn().mockResolvedValue(0),
  hGetAll: jest.fn().mockResolvedValue({}),
  hKeys: jest.fn().mockResolvedValue([]),
  hVals: jest.fn().mockResolvedValue([]),
  
  // Set operations
  sAdd: jest.fn().mockResolvedValue(1),
  sRem: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  sIsMember: jest.fn().mockResolvedValue(0),
  sCard: jest.fn().mockResolvedValue(0),
  
  // List operations
  lPush: jest.fn().mockResolvedValue(1),
  rPush: jest.fn().mockResolvedValue(1),
  lPop: jest.fn().mockResolvedValue(null),
  rPop: jest.fn().mockResolvedValue(null),
  lLen: jest.fn().mockResolvedValue(0),
  lRange: jest.fn().mockResolvedValue([]),
  
  // Sorted set operations
  zAdd: jest.fn().mockResolvedValue(1),
  zRem: jest.fn().mockResolvedValue(1),
  zScore: jest.fn().mockResolvedValue(null),
  zRange: jest.fn().mockResolvedValue([]),
  zCard: jest.fn().mockResolvedValue(0),
  
  // Key operations
  keys: jest.fn().mockResolvedValue([]),
  scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
  
  // Transaction operations
  multi: jest.fn(() => ({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    incr: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  
  // Pipeline operations
  pipeline: jest.fn(() => ({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    incr: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  
  // Pub/Sub operations
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(0),
  
  // Connection status
  isReady: true,
  status: 'ready',
  
  // Event emitter methods
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  
  // Custom methods for testing
  __reset: () => {
    Object.values(mockRedisClient).forEach(method => {
      if (typeof method === 'function' && method.mockClear) {
        method.mockClear()
      }
    })
  },
  
  __setResponse: (method, response) => {
    if (mockRedisClient[method] && mockRedisClient[method].mockResolvedValue) {
      mockRedisClient[method].mockResolvedValue(response)
    }
  },
  
  __setError: (method, error) => {
    if (mockRedisClient[method] && mockRedisClient[method].mockRejectedValue) {
      mockRedisClient[method].mockRejectedValue(error)
    }
  }
}

// Mock the createClient function
const createClient = jest.fn(() => mockRedisClient)

module.exports = {
  createClient,
  mockRedisClient
}

// Export default for ES modules
module.exports.default = {
  createClient,
  mockRedisClient
}