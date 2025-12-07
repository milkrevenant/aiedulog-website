# Troubleshooting FAQ

## 1. Authentication (Cognito)

### Q: I get "redirect_uri_mismatch" error when logging in.

**Cause:** The URL configured in AWS Cognito (Allowed Callback URLs) does not match the one the application is sending.
**Solution:**

1. Go to AWS Console > Cognito > User Pool > App integration > App client settings.
2. Verify "Callback URL(s)" includes:
   - Development: `http://localhost:3000/api/auth/callback/cognito` (or `127.0.0.1`)
   - Production: `https://www.aiedulog.com/api/auth/callback/cognito`
3. Ensure the app is running on the correct port.

### Q: "Unauthorized" when accessing `/admin`.

**Cause:** The logged-in user does not have the required group/role.
**Solution:**

1. Check CloudWatch logs or `/api/me/permissions` to see current user roles.
2. In AWS Cognito, go to the user -> "Groups" and ensure they are added to `admin` or `moderator` group.
3. Re-login to refresh the ID token with the new group claims.

---

## 2. Database (Docker & RDS)

### Q: "Database connection failed" in local development.

**Solution:**

1. Check if Docker container is running: `docker ps`.
2. Ensure you are connecting to port **5433** (mapped port), not 5432.
   - Env var: `POSTGRES_PORT=5433`
3. Check logs: `docker logs <container_id>`.

### Q: App connects to wrong database (Supabase instead of RDS, or vice versa).

**Solution:**

- Check `NEXT_PUBLIC_USE_RDS` or equivalent feature flags in `.env.local`.
- Verify which adapter is being loaded in `src/lib/db/index.ts`.

---

## 3. Deployment (EC2 & AWS)

### Q: Cannot SSH into EC2 instance (`Connection timed out`).

**Cause:** Security Group rules or ISP blocking port 22.
**Solution:**

- **ISP Block:** Try using a mobile hotspot or VPN to check if it's a network issue.
- **Session Manager:** If enabled, use AWS Systems Manager Session Manager (no SSH port needed).
- **Security Group:** Verify Inbound Rules allow your current IP on port 22.

### Q: 500 Error on `www.aiedulog.com` but works locally.

**Cause:** Missing environment variables in production.
**Solution:**

- Check `amplify.yml` (if using Amplify) or EC2 `.env.production`.
- Ensure strictly required vars like `COGNITO_CLIENT_ID` are set.
- Check PM2/Server logs: `pm2 logs`.

---

## 4. General Development

### Q: ESLint shows too many warnings.

**Solution:**

- Run `npm run lint -- --fix` to auto-fix simple formatting issues.
- Refer to `docs/guides/eslint_cleanup.md` for a strategy to reduce noise.
