# AIedulog Security System

A comprehensive, simplified security system for protecting all API endpoints in the AIedulog application.

## 🎯 Design Goals

- **Simple & Maintainable**: ~300 lines of core security code vs 1,200+ lines of previous system
- **Automatic Protection**: Security applied to ALL API routes with minimal code changes
- **Fail-Safe**: Secure by default with clear fallback mechanisms
- **Production-Ready**: Environment-aware error handling and logging
- **Easy to Debug**: Clear error messages in development, sanitized in production

## 📁 File Structure

```
src/lib/security/
├── core-security.ts      # Core security functions (~150 lines)
├── api-wrapper.ts        # Universal API security wrapper (~100 lines)
├── rate-limiter.ts       # Global rate limiting system (~150 lines)
├── error-handler.ts      # Production-safe error handling (~100 lines)
└── README.md            # This documentation
```

## 🚀 Quick Start

### 1. Protect an API Route

Replace your existing route handlers with security-wrapped versions:

```typescript
// Before (insecure)
export async function GET(request: NextRequest) {
  // Your handler code
}

// After (secure)
import { withUserSecurity, SecurityContext } from '@/lib/security/api-wrapper';

export const GET = withUserSecurity(async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  // Your handler code - now has access to security context
  console.log('User ID:', context.userId);
  console.log('User Role:', context.userRole);
  console.log('Risk Level:', context.riskLevel);
});
```

### 2. Handle Errors Safely

```typescript
import { createErrorResponse, ErrorType, handleValidationError } from '@/lib/security/error-handler';

// Replace NextResponse.json error responses
if (!userId) {
  return handleValidationError(context, ['User ID is required'], 'userId');
}

// Replace authentication errors
if (!authenticated) {
  return createErrorResponse(ErrorType.AUTHENTICATION_FAILED, context);
}
```

## 🔒 Security Levels

Choose the appropriate security wrapper for your endpoint:

### `withPublicSecurity` - Public endpoints
- No authentication required
- Basic rate limiting
- Threat detection
- CORS validation (if configured)

```typescript
export const GET = withPublicSecurity(async (request, context) => {
  // Public data that doesn't require authentication
});
```

### `withUserSecurity` - User endpoints
- Authentication required
- User role or higher
- Standard rate limiting
- Full security validation

```typescript
export const GET = withUserSecurity(async (request, context) => {
  // Access user data using context.userId
});
```

### `withAdminSecurity` - Admin endpoints
- Admin authentication required
- Admin role or higher
- Higher rate limits for admin operations
- Detailed audit logging

```typescript
export const GET = withAdminSecurity(async (request, context) => {
  // Admin operations with full audit trail
});
```

### `withHighSecurity` - High-risk operations
- Verified user required
- Restrictive rate limiting
- Enhanced threat detection
- Detailed audit logging

```typescript
export const POST = withHighSecurity(async (request, context) => {
  // Sensitive operations like data deletion
});
```

### `withAuthSecurity` - Authentication endpoints
- Specialized for login/register
- Auth-specific rate limiting
- No authentication required (obviously)
- Enhanced audit logging

```typescript
export const POST = withAuthSecurity(async (request, context) => {
  // Login, register, password reset endpoints
});
```

### `withUploadSecurity` - File upload endpoints
- Authentication required
- Higher file size limits
- Upload-specific rate limiting
- File validation

```typescript
export const POST = withUploadSecurity(async (request, context) => {
  // File upload handling
});
```

## 🔧 Configuration

### Environment Variables

```env
# Rate limiting (optional - has sensible defaults)
RATE_LIMIT_STRICT=false          # Enable stricter rate limits in production
SECURITY_AUDIT_LEVEL=basic       # none, basic, detailed
CORS_ORIGINS=http://localhost:3000,https://aiedulog.com

# Development (optional)
SECURITY_DEV_MODE=true           # More detailed errors in development
```

### Custom Security Configuration

```typescript
import { withSecurity } from '@/lib/security/api-wrapper';

export const GET = withSecurity(handler, {
  requireAuth: true,
  minimumRole: SecurityRole.VERIFIED,
  rateLimitKey: 'custom_endpoint',
  maxRequestSizeMB: 5,
  allowedOrigins: ['https://aiedulog.com'],
  enableCSRF: true,
  auditLevel: 'detailed'
});
```

## 📊 Rate Limiting

The system includes intelligent rate limiting with different levels for different operations:

| Endpoint Type | Window | Requests | Block Duration | Progressive |
|---------------|--------|----------|----------------|-------------|
| Default API   | 15 min | 100      | 15 min         | No          |
| Authentication| 15 min | 10       | 30 min         | Yes         |
| Admin         | 1 hour | 500      | 1 hour         | No          |
| User Mgmt     | 5 min  | 20       | 10 min         | Yes         |
| Upload        | 10 min | 50       | 20 min         | Yes         |
| High Security | 1 hour | 5        | 2 hours        | Yes         |

### Progressive Blocking
For certain endpoints, repeated violations result in exponentially longer blocks.

## 🛡️ Security Features

### 1. Threat Detection
- Path traversal attempts (`../`, `..\\`)
- SQL injection patterns
- XSS attempts (`<script>`, `javascript:`)
- Command injection patterns

### 2. Request Validation
- Request size limits
- Content-type validation
- Malicious pattern detection
- CSRF protection (for state-changing operations)

### 3. Authentication & Authorization
- Session validation
- Role-based access control
- User status checking (blocked/suspended users)

### 4. Audit Logging
All security events are logged to the `security_audit_log` table:
- Authentication attempts
- Authorization failures
- Rate limit violations
- Threat detections
- API access logs

## 🚨 Error Handling

### Production vs Development
- **Development**: Detailed error messages for debugging
- **Production**: Sanitized error messages to prevent information leakage

### Error Types
```typescript
enum ErrorType {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED', 
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Authentication required. Please log in to access this resource.",
    "details": "Session token expired" // Only in development
  },
  "meta": {
    "requestId": "req_1234567890_abc123",
    "timestamp": "2024-01-01T12:00:00Z",
    "riskLevel": "MEDIUM"
  }
}
```

## 🔧 Migration from Old System

### Automatic Migration
Use the migration script to automatically update all API routes:

```bash
node scripts/apply-security-to-all-apis.js
```

This will:
1. Find all API route files
2. Apply appropriate security wrappers
3. Update error handling
4. Create backup files
5. Generate migration report

### Manual Migration Steps
1. Replace `export async function GET` with security wrapper
2. Add security imports
3. Update function signature to include `SecurityContext`
4. Replace error responses with security error functions
5. Remove manual authentication/authorization code

### Before/After Example

```typescript
// BEFORE (old system)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Manual auth check
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Your logic here
    return NextResponse.json({ data: 'success' });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// AFTER (new system)
import { NextRequest, NextResponse } from 'next/server';
import { withUserSecurity, SecurityContext } from '@/lib/security/api-wrapper';

export const GET = withUserSecurity(async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  // Authentication is automatic - context.userId is available
  // context.userRole, context.riskLevel also available
  
  // Your logic here
  return NextResponse.json({ 
    data: 'success',
    userId: context.userId 
  });
});
```

## 🧪 Testing

### Run Security Tests
```bash
node scripts/test-security-system.js
```

This validates:
- Rate limiting functionality
- Role-based authorization
- Threat detection
- CORS validation
- Error handling
- Performance benchmarks

### Integration Testing
```typescript
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { createSecurityContext } from '@/lib/security/core-security';

// Test rate limiting
const context = await createSecurityContext(request);
const rateLimitResult = checkRateLimit(context, 'api_default');
expect(rateLimitResult.allowed).toBe(true);
```

## 📈 Monitoring & Debugging

### Rate Limit Status
```typescript
import { getRateLimitStatus } from '@/lib/security/rate-limiter';

const status = getRateLimitStatus();
console.log('Active rate limit keys:', status.activeKeys);
console.log('Blocked keys:', status.blockedKeys);
console.log('Memory usage:', status.memoryUsage);
```

### Security Context
Every request includes a security context with:
- `requestId`: Unique identifier for tracking
- `userId`: Authenticated user ID (if any)
- `userRole`: User's security role
- `riskLevel`: LOW/MEDIUM/HIGH based on request analysis
- `ipAddress`: Client IP address
- `userAgent`: Client user agent
- `sessionValid`: Whether session is valid

### Audit Logging
Check the `security_audit_log` table for:
- Failed authentication attempts
- Rate limit violations
- Threat detections
- Administrative actions

## 🚨 Emergency Procedures

### Development Bypass (Emergency Only)
```typescript
import { withDevBypass } from '@/lib/security/api-wrapper';

// ONLY for development when security is blocking legitimate work
export const GET = withDevBypass(handler); // Will fail in production
```

### Production Kill Switch
Add to your database `system_config` table:
```sql
INSERT INTO system_config (key, value) VALUES ('emergency_kill_switch', 'active');
```

This will block all requests except from super admin users.

## 🔄 Updates & Maintenance

### Adding New Rate Limit Rules
```typescript
import { addRateLimitConfig } from '@/lib/security/rate-limiter';

addRateLimitConfig('new_endpoint', {
  windowMs: 10 * 60 * 1000,    // 10 minutes
  maxRequests: 30,              // 30 requests
  blockDurationMs: 20 * 60 * 1000, // 20 minute block
  progressiveBlock: true        // Enable progressive blocking
});
```

### Custom Security Validation
```typescript
export const GET = withSecurity(handler, {
  customValidation: async (request, context) => {
    // Your custom security logic
    if (context.riskLevel === 'HIGH' && !context.userId) {
      return false; // Block high-risk anonymous requests
    }
    return true;
  }
});
```

## 📝 Best Practices

1. **Always use security wrappers** - Never create unprotected endpoints
2. **Choose appropriate security levels** - Don't over-secure public endpoints
3. **Use validation errors** - Provide helpful error messages for invalid input
4. **Log security events** - Enable audit logging for sensitive operations
5. **Test thoroughly** - Use the security test suite before deployment
6. **Monitor rate limits** - Check for legitimate users being blocked
7. **Review audit logs** - Look for attack patterns and adjust security accordingly

## 🆘 Troubleshooting

### Common Issues

**Q: Users getting rate limited too aggressively**
A: Adjust rate limit configuration or check for bot traffic

**Q: Authentication failing for valid users**  
A: Check session validation and database connection

**Q: Development errors too verbose**
A: Set `NODE_ENV=production` or adjust `SECURITY_DEV_MODE`

**Q: CORS errors in browser**
A: Configure `allowedOrigins` or add CORS_ORIGINS env var

**Q: High memory usage**
A: Rate limiter cleanup runs every 5 minutes, or restart service

### Debug Mode
```typescript
// Add to any security wrapper for detailed logging
export const GET = withSecurity(handler, {
  auditLevel: 'detailed' // Enables verbose security logging
});
```

---

## 🎉 Migration Complete!

Your API is now protected by the new security system. All routes automatically get:
- ✅ Rate limiting with DDoS protection
- ✅ Authentication and authorization
- ✅ Input validation and threat detection
- ✅ Production-safe error handling
- ✅ Comprehensive audit logging
- ✅ CORS and CSRF protection

The system is designed to be secure by default while remaining simple to use and maintain.