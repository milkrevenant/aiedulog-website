# Production Secrets Rotation & Storage

Use these steps to rotate database credentials, store them in AWS SSM Parameter Store as `SecureString`, and let the app read them via IAM.

## 1) Rotate RDS Credentials
1. Generate a strong password:
   ```bash
   openssl rand -base64 32
   ```
2. Connect to the RDS instance (admin user) and create the production app user:
   ```sql
   CREATE USER aiedulog_prod WITH PASSWORD '<new_strong_password>';
   GRANT ALL PRIVILEGES ON DATABASE aiedulog TO aiedulog_prod;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aiedulog_prod;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aiedulog_prod;
   ```
3. (Optional) Reassign owned objects from the old user, then drop the old user after the application is validated:
   ```sql
   REASSIGN OWNED BY <old_user> TO aiedulog_prod;
   DROP USER <old_user>;
   ```

## 2) Store Secrets in SSM Parameter Store (SecureString)
Use the same KMS key that the instance/Task role can decrypt. Include `--overwrite` when rotating.
```bash
aws ssm put-parameter --name "/aiedulog/prod/DB_HOST" --value "<rds_endpoint>" --type "SecureString" --overwrite
aws ssm put-parameter --name "/aiedulog/prod/DB_PORT" --value "5432" --type "SecureString" --overwrite
aws ssm put-parameter --name "/aiedulog/prod/DB_NAME" --value "aiedulog" --type "SecureString" --overwrite
aws ssm put-parameter --name "/aiedulog/prod/DB_USER" --value "aiedulog_prod" --type "SecureString" --overwrite
aws ssm put-parameter --name "/aiedulog/prod/DB_PASSWORD" --value "<new_strong_password>" --type "SecureString" --overwrite
aws ssm put-parameter --name "/aiedulog/prod/NEXTAUTH_SECRET" --value "$(openssl rand -base64 32)" --type "SecureString" --overwrite
aws ssm put-parameter --name "/aiedulog/prod/COGNITO_CLIENT_SECRET" --value "<cognito_client_secret>" --type "SecureString" --overwrite
```
Add any other app secrets under `/aiedulog/prod/*` with the same pattern.

### Quick retrieval test (instance/Task role)
```bash
aws ssm get-parameter --name "/aiedulog/prod/DB_HOST" --with-decryption
```

## 3) IAM Policy to Read Secrets
Attach `aiedulog/infra/iam/ssm-parameter-read-policy.json` to the EC2 Instance Profile or ECS Task Role. Replace `<account-id>` and `<kms-key-id>` before attaching.

## 4) Application Environment
- Populate production env from SSM at boot/deploy time (e.g., user data, ECS task env, or secrets integration).
- Keep `.env.migration` empty of real values; use `.env.example` for variable names only.

## 5) Post-Rotation Cleanup
- Restart services to pick up the new secrets.
- Remove any cached or old credentials from shells/CI variables.
- Confirm application health and revoke the old user if no longer needed.
