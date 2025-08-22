# UI/UX Fixes - Fundamental Solution Plan

## Issues Identified

### Issue 1: Login Error Messages in English
**Problem**: Error messages show raw Supabase errors like "Invalid credentials"
**Location**: `/auth/login/page.tsx`
**Impact**: Poor UX for Korean users

### Issue 2: Chat Sidebar Won't Dismiss
**Problem**: Chat sidebar stays open even when clicking outside
**Location**: `/board/education/[level]/page.tsx` and similar board pages
**Impact**: Blocks content, frustrating UX

## Root Cause Analysis

### Issue 1: Error Message Handling
```tsx
// Current implementation
catch (error: any) {
  setError(error.message) // Shows raw English error
}
```
**Root Cause**: No error message translation layer

### Issue 2: Sidebar State Management
```tsx
// Current implementation in board pages
<SideChat user={user} /> // Missing open/close state
```
**Root Cause**: No state management for sidebar visibility

## Fundamental Solution Architecture

### Solution 1: Error Message Translation System

#### Approach A: Error Mapping (Recommended)
```typescript
// Create error translator utility
const ERROR_MESSAGES = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Invalid credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 필요합니다.',
  'User not found': '등록되지 않은 사용자입니다.',
  // Add more mappings
}

function translateError(error: string): string {
  // Check for known patterns
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  // Fallback to generic message
  return '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
}
```

#### Approach B: Error Code Based (Future-proof)
```typescript
// Use Supabase error codes instead of messages
function handleAuthError(error: any): string {
  switch(error.code) {
    case 'invalid_credentials':
      return '이메일 또는 비밀번호가 올바르지 않습니다.'
    case 'email_not_confirmed':
      return '이메일 인증이 필요합니다.'
    default:
      return '로그인 중 오류가 발생했습니다.'
  }
}
```

### Solution 2: Global Sidebar State Management

#### Approach A: Local State (Simple, Quick)
```typescript
// Add to each board page
const [chatOpen, setChatOpen] = useState(false)

// Floating button to open
<Fab onClick={() => setChatOpen(true)}>
  <Chat />
</Fab>

// SideChat with proper state
<SideChat 
  user={user}
  open={chatOpen}
  onClose={() => setChatOpen(false)}
/>
```

#### Approach B: Context State (Scalable)
```typescript
// Create ChatContext
const ChatContext = createContext({
  isOpen: false,
  toggleChat: () => {},
  closeChat: () => {},
})

// Use in components
const { isOpen, closeChat } = useChatContext()
```

#### Approach C: Click Outside Hook (Reusable)
```typescript
// Create useClickOutside hook
function useClickOutside(ref: RefObject, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      handler()
    }
    
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
```

## Implementation Plan

### Phase 1: Quick Fixes (Today)
1. **Login Error Messages**
   - Create error translation utility
   - Update login page to use translated messages
   - Test with various error scenarios

2. **Sidebar State Management**
   - Add state management to board pages
   - Add floating chat button
   - Ensure Drawer onClose works

### Phase 2: Systematic Improvements (This Week)
1. **Error System**
   - Create comprehensive error dictionary
   - Add error boundary components
   - Implement toast notifications

2. **Sidebar System**
   - Create ChatProvider context
   - Implement click-outside hook
   - Add animations and transitions

### Phase 3: Polish (Next Week)
1. **Error UX**
   - Add helpful suggestions for each error
   - Add retry mechanisms
   - Add loading states

2. **Sidebar UX**
   - Add unread message badges
   - Add minimize/maximize states
   - Add keyboard shortcuts (ESC to close)

## File Changes Required

### For Error Messages
1. `/src/lib/utils/errorTranslator.ts` - NEW
2. `/src/app/auth/login/page.tsx` - UPDATE
3. `/src/app/auth/signup/page.tsx` - UPDATE

### For Sidebar
1. `/src/hooks/useClickOutside.ts` - NEW
2. `/src/app/board/education/[level]/page.tsx` - UPDATE
3. `/src/app/board/[category]/page.tsx` - UPDATE
4. `/src/app/board/job/[subCategory]/page.tsx` - UPDATE
5. All other board pages - UPDATE

## Success Criteria

### Error Messages
- ✅ All auth errors show in Korean
- ✅ Errors are user-friendly
- ✅ Errors provide actionable guidance

### Sidebar
- ✅ Clicking outside closes sidebar
- ✅ ESC key closes sidebar
- ✅ Smooth animations
- ✅ Consistent behavior across all pages

## Testing Checklist

### Error Messages
- [ ] Wrong password shows Korean message
- [ ] Non-existent email shows Korean message
- [ ] Network error shows Korean message
- [ ] MFA errors handled properly

### Sidebar
- [ ] Click outside closes on desktop
- [ ] Touch outside closes on mobile
- [ ] ESC key closes sidebar
- [ ] Reopening works properly
- [ ] Messages persist between open/close

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing error translation | Medium | Use fallback message |
| Sidebar state conflicts | Low | Use local state first |
| Performance impact | Low | Use React.memo |
| Mobile touch issues | Medium | Test thoroughly |

## Rollback Plan
If issues arise:
1. Error messages: Revert to English (working state)
2. Sidebar: Remove state management (always open)

## Estimated Time
- Error translation: 30 minutes
- Sidebar state: 45 minutes
- Testing: 30 minutes
- Total: ~2 hours