# Post-Login Issue Resolution Plan

## 1. Issue List by Page

### Global Issues

- **[RESOLVED] Cognito Callback Error**
  - **Symptom:** Logs show `error_description=unauthorized_client` and `error=invalid_request` at `/api/auth/callback/cognito`.
  - **Resolution:** Switched to custom login UI with direct Cognito API calls (bypassing Hosted UI).
  - **Changes Made:**
    - Installed `@aws-sdk/client-cognito-identity-provider`
    - Rewrote `auth-options.ts` to use CredentialsProvider with SECRET_HASH
    - Modified login page to use `signIn('cognito-credentials', ...)`

- **[RESOLVED] SECRET_HASH Required**
  - **Symptom:** `Client is configured with secret but SECRET_HASH was not received`
  - **Resolution:** Switched from `amazon-cognito-identity-js` to AWS SDK with SECRET_HASH calculation.

- **[RESOLVED] USER_PASSWORD_AUTH Not Enabled**
  - **Symptom:** `USER_PASSWORD_AUTH flow not enabled for this client`
  - **Resolution:** Enabled via AWS CLI:
    ```bash
    aws cognito-idp update-user-pool-client \
      --user-pool-id ap-northeast-2_aMs5e49zf \
      --client-id 4gpfcjivlojgdo45ica72q14m8 \
      --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH
    ```

- **[TESTING] Login Flow**
  - Test account: `stillalice@njgs.hs.jne.kr` / `Test1234!`
  - Status: Awaiting test result

### Dashboard (`/dashboard`)

- **Possible Issues:**
  - Missing user profile data (requires `auth_methods` mapping).
  - "Profile not found" even if logged in.
- **Investigation Plan:** Check `getUserProfile` logic in `src/app/dashboard/page.tsx`.

### Admin Panel (`/admin`)

- **Possible Issues:**
  - 403 Forbidden loop.
  - Role verification failure.
- **Investigation Plan:** Verify `src/middleware.ts` or page-level role checks.

### Training Materials (`/training-materials`)

- **Possible Issues:**
  - Grid/List view state persistence fails on refresh.
  - S3 image load failure (CORS/Permissions).
- **Investigation Plan:** Check local storage usage and S3 bucket policy.

### Other Pages

- `aboutus`: Static content check.
- `board`: Post creation permission check.

## 2. Fix Strategy

### Phase 1: Authentication Stabilization

- [x] **Fix Callback Error:** Switched to custom UI with direct Cognito API.
- [x] **Enable USER_PASSWORD_AUTH:** Completed via AWS CLI.
- [ ] **Session Persistence:** Verify `next-auth.session-token` cookie settings.

### Phase 2: User Data Mapping

- [ ] **Profile Sync:** Ensure `auth_methods` table has the correct `provider_id` (sub) for the Cognito user.
- [ ] **Role Assignment:** Verify `staff_members` table linkage.

### Phase 3: Page-Specific Debugging

- Iterate through each page, capture console errors, and apply fixes.

## 3. Files Modified

- `src/lib/auth/auth-options.ts` - Rewritten to use AWS SDK with SECRET_HASH
- `src/app/auth/login/page.tsx` - Updated to use CredentialsProvider
- `.env.local` - Added `NEXT_PUBLIC_COGNITO_*` variables
- `package.json` - Added `@aws-sdk/client-cognito-identity-provider`

## 4. Next Steps

1. Test login with `stillalice@njgs.hs.jne.kr` / `Test1234!`
2. Verify session creation and /feed redirect
3. Check profile data mapping after login
4. Test admin panel access
