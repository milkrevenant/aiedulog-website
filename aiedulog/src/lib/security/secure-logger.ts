/**
 * Legacy Secure Logging System - DEPRECATED
 * 
 * This file is deprecated in favor of the new runtime-safe security architecture.
 * Please use:
 * - ./edge-safe-logger.ts for all runtime environments
 * - ./runtime-safe-factory.ts for component creation
 * - ./index.ts for unified security system access
 * 
 * This file is kept for backward compatibility only.
 */

// Re-export from the new edge-safe logger for backward compatibility
export {
  LogLevel,
  SecurityEventType,
  edgeSafeLogger as secureLogger
} from './edge-safe-logger'

// Legacy warning for development (Edge Runtime safe)
// Warning disabled for Edge Runtime compatibility

// Export the edge-safe logger as default for backward compatibility
import { edgeSafeLogger } from './edge-safe-logger'
export default edgeSafeLogger

/*
 * IMPORTANT: The original SecureLogger class implementation has been moved to
 * ./edge-safe-logger.ts and enhanced for runtime compatibility.
 * 
 * This file now serves only as a compatibility layer to prevent breaking changes
 * in existing imports. All new code should use the runtime-safe security system.
 * 
 * Migration Guide:
 * 
 * OLD (deprecated):
 *   import { secureLogger } from './secure-logger'
 *   secureLogger.info('message')
 * 
 * NEW (recommended):
 *   import { getSecurityLogger } from '@/lib/security'
 *   const logger = getSecurityLogger()
 *   logger.info('message')
 * 
 * Or use direct import:
 *   import { edgeSafeLogger } from './edge-safe-logger'
 *   edgeSafeLogger.info('message')
 */