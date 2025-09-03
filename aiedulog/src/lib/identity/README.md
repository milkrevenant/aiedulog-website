# Identity System Migration Guide

## Overview

The identity system has been upgraded with a new `StableIdentityService` that provides consistent user resolution using the improved `ensure_user_identity()` database function. This service offers better performance, reliability, and future compatibility with other auth providers.

## Key Improvements

### ✅ Enhanced Reliability
- **Email-first resolution strategy** prevents duplicate identity creation
- **Handles auth.user.id regeneration** automatically
- **Atomic database operations** prevent race conditions
- **Comprehensive error handling** with graceful fallbacks

### ✅ Better Performance
- **In-memory caching** reduces database queries
- **Parallel query execution** for statistics
- **Cache invalidation strategies** ensure data freshness
- **Smart query optimization** for search operations

### ✅ Future Compatibility
- **Provider-agnostic design** ready for Cognito integration
- **Abstract interface** allows easy auth provider swapping
- **Configurable service options** for different environments
- **Comprehensive TypeScript types** for better development experience

## Migration Path

### Existing Code (No Changes Required)

The existing helper functions continue to work unchanged:

```typescript
import { getUserIdentity, getIdentityId, searchUsers } from '@/lib/identity/helpers'

// All existing code continues to work
const identity = await getUserIdentity(user)
const identityId = await getIdentityId(user)
const users = await searchUsers('john')
```

### New Advanced Usage

For components that need advanced features:

```typescript
import { getAdvancedIdentityService } from '@/lib/identity/helpers'

const service = getAdvancedIdentityService()

// Access advanced features
const config = service.getConfig()
const stats = service.getCacheStats()
service.clearUserCache(userId)
```

## Usage Examples

### Basic Identity Resolution

```typescript
import { getUserIdentity } from '@/lib/identity/helpers'

export default function MyComponent() {
  const [identity, setIdentity] = useState<IdentityData | null>(null)
  
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Uses improved ensure_user_identity() function automatically
        const userIdentity = await getUserIdentity(user)
        setIdentity(userIdentity)
      }
    }
    loadUser()
  }, [])
  
  return <div>{identity?.profile.nickname}</div>
}
```

### Advanced Service Usage

```typescript
import { 
  getAdvancedIdentityService,
  clearUserIdentityCache 
} from '@/lib/identity/helpers'

export default function UserProfileEditor() {
  const service = getAdvancedIdentityService()
  
  const handleProfileUpdate = async (userId: string, data: any) => {
    // Update profile in database
    await updateUserProfile(userId, data)
    
    // Clear cache to ensure fresh data on next fetch
    clearUserIdentityCache(userId)
    
    // Or get updated identity directly
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const freshIdentity = await service.resolveUserIdentity(user)
      // freshIdentity will bypass cache and get latest data
    }
  }
  
  return <ProfileForm onSave={handleProfileUpdate} />
}
```

### Error Handling

```typescript
import { 
  getUserIdentity,
  IdentityServiceError,
  IdentityNotFoundError 
} from '@/lib/identity/helpers'

const handleIdentityResolution = async (user: User) => {
  try {
    const identity = await getUserIdentity(user)
    if (!identity) {
      throw new Error('Identity not found')
    }
    return identity
  } catch (error) {
    if (error instanceof IdentityNotFoundError) {
      // Handle identity not found
      console.error('User identity not found:', error.details)
    } else if (error instanceof IdentityServiceError) {
      // Handle service errors
      console.error('Identity service error:', error.code, error.message)
    } else {
      // Handle other errors
      console.error('Unexpected error:', error)
    }
    return null
  }
}
```

### Performance Monitoring

```typescript
import { getIdentityCacheStats } from '@/lib/identity/helpers'

export function IdentityServiceMonitor() {
  const [stats, setStats] = useState({ size: 0, keys: [] })
  
  useEffect(() => {
    const updateStats = () => {
      setStats(getIdentityCacheStats())
    }
    
    // Monitor cache usage
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div>
      <p>Cache Size: {stats.size}</p>
      <p>Cached Keys: {stats.keys.length}</p>
    </div>
  )
}
```

## Configuration Options

The service can be configured for different environments:

```typescript
import { getAdvancedIdentityService } from '@/lib/identity/helpers'

const service = getAdvancedIdentityService()

// Update configuration
service.updateConfig({
  cacheEnabled: process.env.NODE_ENV === 'production', // Disable cache in development
  cacheTTL: 600000, // 10 minutes
  maxRetries: 5,
  retryDelay: 2000,
  enableLogging: true
})
```

## Database Function Integration

The service automatically uses the improved `ensure_user_identity()` database function which:

1. **Email-first resolution** - Uses email as primary identifier
2. **Handles auth.user.id changes** - Updates mappings when auth provider regenerates IDs
3. **Atomic operations** - Prevents race conditions in high-concurrency scenarios
4. **Automatic profile creation** - Creates missing profiles automatically
5. **Comprehensive error handling** - Returns detailed error information

## Performance Benefits

### Before (Legacy getUserIdentity)
- Multiple sequential database queries
- No caching
- Manual error handling
- Potential duplicate identity creation

### After (StableIdentityService)
- Single database function call with `ensure_user_identity()`
- In-memory caching with TTL
- Comprehensive error handling with fallbacks
- Atomic identity resolution preventing duplicates

## Testing

The service includes comprehensive testing utilities:

```typescript
import { 
  getAdvancedIdentityService,
  resetIdentityService 
} from '@/lib/identity/helpers'

describe('Identity Service', () => {
  beforeEach(() => {
    resetIdentityService() // Reset singleton for clean tests
  })
  
  it('should resolve user identity', async () => {
    const service = getAdvancedIdentityService(mockSupabaseClient)
    const identity = await service.resolveUserIdentity(mockUser)
    expect(identity).toBeDefined()
  })
})
```

## Future Roadmap

### Phase 1: Current (Supabase Integration) ✅
- StableIdentityService implementation
- ensure_user_identity() function integration
- Backward compatible helper functions
- In-memory caching system

### Phase 2: Cognito Compatibility (Planned)
- AWS Cognito provider implementation
- Multi-provider service architecture
- Provider-specific optimizations
- Seamless provider switching

### Phase 3: Advanced Features (Future)
- Distributed caching with Redis
- Real-time identity synchronization
- Advanced analytics and monitoring
- Identity federation support

## Support

For questions or issues with the identity system:

1. Check the existing helper functions first - they should handle most use cases
2. Use the advanced service for custom requirements
3. Refer to this guide for common patterns
4. Check the source code for detailed TypeScript types and documentation

The system is designed to be backward compatible, so existing code should continue working without changes while benefiting from the improved reliability and performance.