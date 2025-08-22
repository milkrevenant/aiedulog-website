# Migration Guide: Supabase Authentication Update

## What's Changed

### New Features Added
1. **Middleware Protection**: Routes are now protected at the edge level
2. **Auth Hooks**: New `useAuth()`, `useUser()`, `useSession()` hooks for better state management
3. **Auth Context**: Centralized authentication state with `AuthProvider`
4. **Server Helpers**: New server-side authentication utilities
5. **Automatic Session Refresh**: Sessions refresh automatically in the background

## How to Update Your Components

### 1. Replace AuthGuard with Middleware Protection

**Before:**
```tsx
import AuthGuard from '@/components/AuthGuard'

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourContent />
    </AuthGuard>
  )
}
```

**After:**
```tsx
// No AuthGuard needed - middleware handles protection
export default function ProtectedPage() {
  return <YourContent />
}
```

### 2. Use New Auth Hooks

**Before:**
```tsx
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

function Component() {
  const [user, setUser] = useState(null)
  const supabase = createClient()
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])
  
  // ...
}
```

**After:**
```tsx
import { useAuthContext } from '@/lib/auth/context'

function Component() {
  const { user, loading, isAuthenticated } = useAuthContext()
  
  if (loading) return <div>Loading...</div>
  
  // ...
}
```

### 3. Update Server Components

**Before:**
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  // ...
}
```

**After:**
```tsx
import { requireAuth, getUser } from '@/lib/supabase/auth-helpers'

export default async function ServerComponent() {
  const session = await requireAuth() // Automatically redirects if not authenticated
  const user = session.user
  
  // ...
}
```

### 4. Update Sign In/Out Logic

**Before:**
```tsx
const handleSignIn = async (email: string, password: string) => {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (!error) {
    router.push('/dashboard')
  }
}

const handleSignOut = async () => {
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push('/auth/login')
}
```

**After:**
```tsx
import { useAuthContext } from '@/lib/auth/context'

function Component() {
  const { signIn, signOut } = useAuthContext()
  
  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn(email, password)
      // Navigation handled automatically
    } catch (error) {
      console.error(error)
    }
  }
  
  const handleSignOut = async () => {
    await signOut() // Navigation handled automatically
  }
}
```

### 5. Access User Profile

**Before:**
```tsx
const [profile, setProfile] = useState(null)

useEffect(() => {
  if (user) {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }
}, [user])
```

**After:**
```tsx
const { profile, isAdmin, isModerator } = useAuthContext()

// Profile is automatically fetched and cached
// Role checks are built-in
```

## Protected Routes Configuration

Routes are automatically protected based on patterns in `middleware.ts`:

### Protected Routes (require authentication):
- `/dashboard/*`
- `/admin/*` (also requires admin/moderator role)
- `/settings/*`
- `/chat/*`
- `/feed/*`
- `/notifications/*`

### Public Routes (no authentication required):
- `/`
- `/aboutus`
- `/board/*`
- `/main`
- `/auth/*` (login, signup, etc.)

## Quick Start Checklist

- [x] Middleware created and configured
- [x] Auth hooks implemented
- [x] Auth context provider added
- [x] Server helpers created
- [ ] Remove AuthGuard from all pages
- [ ] Update components to use new hooks
- [ ] Test authentication flows
- [ ] Test session refresh
- [ ] Test protected routes

## Common Patterns

### Check Authentication Status
```tsx
const { isAuthenticated, loading } = useAuthContext()

if (loading) return <Spinner />
if (!isAuthenticated) return <LoginPrompt />
```

### Role-Based Rendering
```tsx
const { isAdmin, isModerator } = useAuthContext()

return (
  <div>
    {isAdmin && <AdminPanel />}
    {isModerator && <ModeratorTools />}
  </div>
)
```

### Update User Profile
```tsx
const { updateProfile } = useAuthContext()

const handleUpdate = async (data) => {
  try {
    await updateProfile(data)
    toast.success('Profile updated!')
  } catch (error) {
    toast.error('Update failed')
  }
}
```

## Troubleshooting

### Issue: User stays logged in after signOut
**Solution**: Clear browser cache and cookies, ensure middleware is properly configured

### Issue: Session expires too quickly
**Solution**: Check Supabase dashboard JWT expiry settings

### Issue: Profile not loading
**Solution**: Ensure profiles table has proper RLS policies

### Issue: Middleware not working
**Solution**: Check middleware.ts matcher configuration and restart dev server

## Benefits of This Migration

1. **Better Security**: Edge-level protection, no client-side bypass
2. **Improved Performance**: Cached auth state, fewer database queries
3. **Better UX**: Automatic session refresh, faster page loads
4. **Cleaner Code**: Centralized auth logic, reusable hooks
5. **Type Safety**: Full TypeScript support with proper types

## Next Steps

1. Test all authentication flows thoroughly
2. Update remaining components to use new auth system
3. Remove old AuthGuard component once migration is complete
4. Monitor for any authentication issues in production
5. Consider adding analytics to track auth events