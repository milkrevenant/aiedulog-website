# Quick Auth Reference

## 🚀 Most Common Patterns

### Get Current User (Client Component)
```tsx
'use client'
import { useAuthContext } from '@/lib/auth/context'

function Component() {
  const { user, loading } = useAuthContext()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>
  
  return <div>Welcome {user.email}</div>
}
```

### Get Current User (Server Component)
```tsx
import { getUser } from '@/lib/supabase/auth-helpers'

export default async function Page() {
  const user = await getUser()
  
  if (!user) return <div>Not logged in</div>
  
  return <div>Welcome {user.email}</div>
}
```

### Require Authentication (Server)
```tsx
import { requireAuth } from '@/lib/supabase/auth-helpers'

export default async function ProtectedPage() {
  const session = await requireAuth() // Auto-redirects if not authenticated
  
  return <div>Protected content for {session.user.email}</div>
}
```

### Check Admin Role (Client)
```tsx
const { isAdmin, isModerator } = useAuthContext()

return (
  <>
    {isAdmin && <AdminPanel />}
    {isModerator && <ModeratorTools />}
  </>
)
```

### Sign In
```tsx
const { signIn } = useAuthContext()

const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await signIn(email, password)
    // Auto-redirects on success
  } catch (error) {
    setError(error.message)
  }
}
```

### Sign Out
```tsx
const { signOut } = useAuthContext()

<Button onClick={signOut}>Logout</Button>
```

### Update Profile
```tsx
const { updateProfile, profile } = useAuthContext()

const handleUpdate = async (data) => {
  try {
    await updateProfile(data)
    toast.success('Profile updated!')
  } catch (error) {
    toast.error('Failed to update')
  }
}
```

## 📁 File Locations

- **Middleware**: `src/middleware.ts`
- **Server Helpers**: `src/lib/supabase/auth-helpers.ts`
- **Client Hooks**: `src/lib/auth/hooks.ts`
- **Auth Context**: `src/lib/auth/context.tsx`
- **Supabase Client**: `src/lib/supabase/client.ts`
- **Supabase Server**: `src/lib/supabase/server.ts`

## 🔒 Protected Routes (Automatic)

These routes are automatically protected by middleware:
- `/dashboard/*`
- `/admin/*` (+ role check)
- `/settings/*`
- `/chat/*`
- `/feed/*`
- `/notifications/*`

## ⚡ Available from useAuthContext()

```tsx
const {
  // State
  user,           // User object or null
  session,        // Session object or null
  profile,        // User profile from database
  loading,        // Loading state
  error,          // Error state
  
  // Methods
  signIn,         // Sign in with email/password
  signUp,         // Sign up new user
  signOut,        // Sign out user
  updateProfile,  // Update user profile
  
  // Computed
  isAuthenticated, // Boolean: is user logged in
  isAdmin,        // Boolean: is user admin
  isModerator,    // Boolean: is user moderator
  isVerified,     // Boolean: is user verified
} = useAuthContext()
```

## 🛠️ Server Helpers Available

```tsx
import {
  getSession,      // Get current session or null
  getUser,         // Get current user or null
  requireAuth,     // Get session or redirect to login
  requireAdmin,    // Get session or redirect (admin only)
  requireModerator,// Get session or redirect (mod/admin)
  getUserProfile,  // Get user profile by ID
  signOut,         // Sign out and redirect
} from '@/lib/supabase/auth-helpers'
```

## ❌ Don't Do This Anymore

```tsx
// DON'T: Use AuthGuard
import AuthGuard from '@/components/AuthGuard'
<AuthGuard><Content /></AuthGuard>

// DON'T: Create Supabase client for auth
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

// DON'T: Manual redirects
if (!user) router.push('/auth/login')

// DON'T: Fetch profile manually
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
```

## ✅ Do This Instead

```tsx
// DO: Let middleware handle protection
// Just write your component normally

// DO: Use auth hooks
const { user } = useAuthContext()

// DO: Use server helpers
const session = await requireAuth()

// DO: Use cached profile
const { profile } = useAuthContext()
```

## 🎯 Migration Checklist for Each File

When updating a file:
1. [ ] Remove `import AuthGuard`
2. [ ] Remove `createClient()` for auth
3. [ ] Add `import { useAuthContext }`
4. [ ] Replace auth logic with hooks
5. [ ] Test the component

## 🔍 Quick Debug

```tsx
// Check what's in auth context
const auth = useAuthContext()
console.log('Auth state:', {
  user: auth.user?.email,
  isAuthenticated: auth.isAuthenticated,
  profile: auth.profile,
  loading: auth.loading
})
```