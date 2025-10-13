# Auth Migration - Phase 1 Summary (NextAuth + AWS Cognito)

## Scope (Completed in Phase 1)
- Replaced Supabase Auth usage (client-side) with NextAuth + Cognito while preserving MUI UI.
- MFA: migrated to Cognito Hosted UI flow; removed Supabase MFA calls.
- Created .env.local with production values (domain, region, pool, client). NEXTAUTH_SECRET is placeholder.

## Updated Files
- Components/UI
  - src/components/MFAVerification.tsx → Cognito Hosted UI continue/retry flow
  - src/components/AppHeader.tsx → useSession/signOut
  - src/components/Navbar.tsx → useSession/signOut
  - src/components/NotificationIcon.tsx → provider user id based; no supabase.auth
  - src/components/KanbanBoard.tsx → creator id = (session.user.sub || id)
  - src/components/admin/UserDeletionDialog.tsx → audit deleted_by via provider id
- Pages
  - src/app/auth/login/page.tsx → removed MFA branches; NextAuth signIn('cognito')
  - src/app/settings/security/page.tsx → Supabase MFA UI removed, link to Cognito settings
  - src/app/settings/profile/page.tsx → useSession + identity; avatar upload using provider id
  - src/app/main/page.tsx → useSession; identity preserved
  - Board pages → useSession where needed, identity preserved
    - src/app/board/lectures/page.tsx
    - src/app/board/trending/page.tsx
    - src/app/board/job/[subCategory]/page.tsx
    - src/app/board/education/[level]/page.tsx
- Auth helpers
  - src/lib/supabase/auth-helpers.ts → NextAuth equivalents (getSession/getUser/requireAuth/...)
- Notifications
  - src/lib/notifications.ts → functions accept providerUserId; mapping via auth_methods

## Existing Infra (unchanged in Phase 1)
- NextAuth Cognito provider: src/app/api/auth/[...nextauth]/route.ts
- Middleware: src/middleware.ts + src/lib/auth/jwt-middleware.ts (Cognito JWT verifier + fallback)

## Environment
- aiedulog/.env.local
  - NEXTAUTH_URL=https://www.aiedulog.com
  - COGNITO_REGION=ap-northeast-2
  - COGNITO_USER_POOL_ID=ap-northeast-2_aMs5e49zf
  - COGNITO_CLIENT_ID=3jhf0l461l2dc5es7i2e5tparg
  - NEXTAUTH_SECRET=REPLACE_WITH_STRONG_SECRET
  - (Optional) COGNITO_CLIENT_SECRET if app client is confidential

## Test Checklist
- Login via Hosted UI redirects to /feed
- Logout returns to /main or /auth/login
- Group → role mapping (admin/moderator/member) works in UI controls
- Settings → Security opens Cognito Hosted UI
- Profile avatar upload/remove works
- Notification badge updates (requires auth_methods mapping for provider_user_id)
- Kanban task create uses provider id

## Known Pending (Phase 2+)
- Server/API routes: replace supabase.auth.getUser()/getSession() with JWTAuthMiddleware.verifyToken() or getServerSession()
- Remove remaining Supabase auth usage across services/admin APIs
- SQL cleanups: remove auth.uid() references (tracked in docs/migrations)
- Permissions: verify session.user.groups → role mapping across protected flows

## Notes
- MUI v7 UI preserved throughout. Only auth logic changed.
- Rollback: revert page/component edits and switch back to Supabase auth helpers if needed.
