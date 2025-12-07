# Cognito Login Test Checklist

## Prerequisites

- [ ] **Docker PostgreSQL running**
  - Verify port `5433` is active
  - Command: `docker ps | grep aiedulog`
- [ ] **Environment Configuration**
  - `.env.local` must contain valid `COGNITO_*` and `NEXTAUTH_*` credentials
- [ ] **Cognito User Setup**
  - Test user exists in AWS Cognito User Pool
  - User is assigned to 'admin' group (for permission tests)
- [ ] **Database Mapping**
  - User's Cognito 'sub' (Subject ID) exists in `auth_methods` table
  - User is linked in `staff_members` table if testing staff permissions

## Test Cases

### 1. Sign In Flow

| Step | Action              | Expected Result                                                      | Pass/Fail |
| ---- | ------------------- | -------------------------------------------------------------------- | --------- |
| 1.1  | Navigate to Sign In | Load `http://127.0.0.1:3000/api/auth/signin`                         |           |
| 1.2  | Initiate Login      | Click "Sign in with Cognito" button                                  |           |
| 1.3  | Redirect            | Browser redirects to AWS Hosted UI domain                            |           |
| 1.4  | Credentials         | Enter valid test user email and password                             |           |
| 1.5  | Callback            | Redirects back to `/api/auth/callback/cognito`                       |           |
| 1.6  | Session             | Redirects to Home/Dashboard. Cookie `next-auth.session-token` is set |           |

### 2. Permission Verification

| Step | Action       | Expected Result                                               | Pass/Fail |
| ---- | ------------ | ------------------------------------------------------------- | --------- |
| 2.1  | API Check    | GET `/api/me/permissions` returns JSON with user permissions  |           |
| 2.2  | Admin Access | Navigate to `/admin`. Page loads without "Unauthorized" error |           |
| 2.3  | Staff Access | Navigate to `/admin/staff`. Permission checks pass            |           |
| 2.4  | Role UI      | Admin-only UI elements are visible (e.g. "Manage Users")      |           |

### 3. Sign Out Flow

| Step | Action          | Expected Result                                              | Pass/Fail |
| ---- | --------------- | ------------------------------------------------------------ | --------- |
| 3.1  | Initiate Logout | Click "Sign out" button in UI                                |           |
| 3.2  | Session Clear   | `next-auth.session-token` cookie is removed                  |           |
| 3.3  | Redirect        | Redirects to home page or sign-in page                       |           |
| 3.4  | Re-access       | Navigate to `/admin`. Should redirect to sign-in or show 403 |           |

## Troubleshooting Notes

- **Redirect Mismatch**: Ensure `http://127.0.0.1:3000/api/auth/callback/cognito` is allowed in Cognito App Client settings.
- **Session Issues**: Check browser console for `SameSite` cookie warnings if testing plain HTTP.
- **Database Errors**: Verify `auth_methods` linking if login succeeds but app treats user as guest.
