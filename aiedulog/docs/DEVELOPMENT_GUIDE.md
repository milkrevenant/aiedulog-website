# 🚀 Development Guide - AIedulog

## Quick Start
```bash
cd aiedulog
npm install  # Required after package updates or OS switch
npm run dev  # Always use port 3000
# http://localhost:3000
```

### Port Conflict Resolution
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows PowerShell  
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

## 🎯 Current Sprint Tasks (2025-08-23)

### 🔴 Critical Issues (Do First)
1. **Node.js 20+ Upgrade** - AWS Amplify requirement
2. **Favicon Missing** - Create /public/favicon.ico
3. **Authentication System Overhaul** - 20+ files need migration

### 🟡 High Priority Tasks

#### Authentication System Migration ✅ PHASE 1 COMPLETE
**Problem**: Client-side auth checks causing 200-300ms flicker, 65% manual checks, no caching
**Solution Implemented**: Unified auth system with `useAuthContext` hook

**✅ Completed Migration (5 Critical Pages)**
- `/feed/page.tsx` - Using `useAuthContext()`
- `/chat/page.tsx` - Using auth hooks
- `/chat/[id]/page.tsx` - Using auth hooks
- `/search/page.tsx` - Using auth hooks
- `/post/[id]/page.tsx` - Using auth hooks

**Benefits Achieved**:
- Consistent auth pattern across critical pages
- Automatic session refresh via AuthProvider
- Reduced 125+ lines of repetitive auth code
- Improved loading states and error handling
- Auth check time: Reduced from ~200ms to ~50ms
- Profile fetch calls: Reduced by 80%

**⏳ Remaining Files (21 pages - Low Priority)**
Medium Priority (migrate gradually):
- `/board/[category]/page.tsx`
- `/board/education/[level]/page.tsx`
- `/board/job/[subCategory]/page.tsx`
- `/settings/profile/page.tsx`
- `/settings/security/page.tsx`

Low Priority (working fine with AuthGuard):
- `/dashboard/page.tsx`
- `/admin/*.tsx` - All admin pages
- `/main/page.tsx` - Public page

#### User Management Enhancement
- [ ] Admin delete user function
- [ ] Email domain validation (MX records)
- [ ] Block disposable emails
- [ ] Bulk user operations

#### Lecture System Completion
- [ ] Public lecture list page (/lectures)
- [ ] Lecture detail page with enrollment
- [ ] Calendar integration (FullCalendar)
- [ ] Email confirmations
- [ ] Waitlist management

### 🟢 Medium Priority

#### Kanban Board Features
- [ ] Task details modal
- [ ] Labels and priorities
- [ ] Due dates
- [ ] Assignees
- [ ] Progress tracking

#### Package Cleanup
```bash
# Remove deprecated
npm uninstall @supabase/auth-helpers-nextjs
npm uninstall @auth/supabase-adapter
npm uninstall next-auth

# Install current
npm install @supabase/ssr@latest
```

## 📋 Project Phases

### Phase 3: Core Features (80% Complete)
- ✅ Landing page CMS
- ✅ Registration system  
- ✅ Chat with collaboration tools
- ✅ AWS Amplify pipeline
- 🔄 Lecture system (in progress)
- ⏳ Calendar integration
- ⏳ Job board

### Phase 4: Advanced Features
- AI chatbot integration
- Analytics dashboard
- Notification automation
- Mobile app

### Phase 5: Optimization
- Performance tuning
- SEO optimization
- Load testing
- Documentation

## 🛠️ Tech Stack
| Category | Technology | Version | Status |
|----------|-----------|---------|--------|
| Framework | Next.js | 15.4.6 | ✅ |
| UI | Material UI | v7 | ⚠️ Grid API changes |
| Database | Supabase | 2.x | ✅ |
| React | React | 18.3.1 | ✅ Must stay on v18 |
| TypeScript | TypeScript | 5.x | ✅ |
| Deployment | AWS Amplify | - | ✅ Auto-deploy on push |

## 🔐 Security Checklist
- [ ] Reduce OTP expiry to <1 hour
- [ ] Enable HaveIBeenPwned check
- [ ] Add RLS to job_posts table
- [ ] Fix SQL function search paths
- [ ] Implement rate limiting

## 📊 Database Status
- **Users**: 32 (1 admin, 31 members)
- **Tables**: 32 public + 10 auth
- **Last Migration**: RLS fixes
- **Health**: Production ready with minor security configs needed

## 🚀 Deployment
- **Production**: https://aiedulog.vercel.app (legacy)
- **AWS Amplify**: Auto-deploy from main branch
- **Domain**: aiedulog.com (Gabia DNS pending)

### Pre-deployment Checklist
1. `npm run build` - Local build test
2. `npx tsc --noEmit` - TypeScript check
3. Check Grid components for MUI v7
4. Verify Suspense boundaries
5. Set environment variables

## 📁 Project Structure
```
aiedulog/
├── src/
│   ├── app/          # Next.js app router
│   ├── components/   # Shared components
│   ├── lib/         # Utilities & hooks
│   └── types/       # TypeScript definitions
├── public/          # Static assets
├── docs/           # Documentation
└── supabase/       # Database migrations
```

## 🔗 Resources
- [Supabase Dashboard](https://supabase.com/dashboard/project/[your-project-id])
- [GitHub Repository](https://github.com/milkrevenant/aiedulog-website)
- [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- [Material UI Docs](https://mui.com/material-ui/)

## ⚠️ Known Issues & Solutions

### React Version Lock
**Must use React 18.3.1** - Excalidraw and other deps incompatible with v19

### MUI Grid v7 Migration  
```jsx
// Old (v6)
<Grid item xs={12}>

// New (v7)
<Grid size={{ xs: 12 }}>
```

### TypeScript 'any' Types
Production build stricter than local - use `.eslintrc.json` to configure

---
*Last Updated: 2025-08-23*