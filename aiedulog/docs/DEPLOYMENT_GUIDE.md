# 🚀 Deployment Guide - AIedulog

## Current Deployment Status
| Platform | URL | Status | Auto-Deploy |
|----------|-----|--------|-------------|
| AWS Amplify | aiedulog.com (pending) | ✅ Active | Yes (main branch) |
| Vercel | https://aiedulog.vercel.app | ⚠️ Legacy | No |
| Domain | aiedulog.com | 🔄 DNS Setup | - |

## AWS Amplify Setup

### Prerequisites
- Node.js 20+ (required by AWS)
- GitHub repository connected
- Environment variables configured

### Build Configuration (`amplify.yml`)
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd aiedulog
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: aiedulog/.next
    files:
      - '**/*'
  cache:
    paths:
      - aiedulog/node_modules/**/*
```

### AWS Console Setup Steps
1. **Access AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"

2. **Connect GitHub Repository**
   - Select "GitHub" as source provider
   - Authenticate with GitHub account
   - Choose repository: `milkrevenant/aiedulog-website`
   - Select branch: `main`

3. **Configure Build Settings**
   - The `amplify.yml` file will be auto-detected
   - No additional configuration needed

4. **Set Environment Variables**
   - Click "Advanced settings"
   - Add the following environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
   SUPABASE_SECRET_KEY=your_supabase_secret_key_here
   ```
   ⚠️ **IMPORTANT**: Never commit real keys to version control!

5. **Deploy Application**
   - Click "Save and deploy"
   - First deployment takes 10-15 minutes
   - Subsequent deployments are faster (5-7 minutes)

### Custom Domain Setup
After deployment:
1. Navigate to "Domain management" → "Add domain"
2. Enter domain: `aiedulog.com`
3. Follow DNS configuration instructions
4. Update DNS records in Gabia or your domain provider

## Pre-Deployment Checklist

### 1. Code Verification
```bash
# TypeScript check
npx tsc --noEmit

# Build test
npm run build

# Linting
npx eslint src --quiet
```

### 2. Dependency Check
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### 3. React Version Lock
```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```
**Critical**: Must stay on React 18 for compatibility

## Common Deployment Issues & Solutions

### Issue 1: MUI Grid v7 Breaking Changes
**Problem**: Grid API completely changed in v7
```jsx
// Before (v6)
<Grid container spacing={2}>
  <Grid item xs={12}>

// After (v7)  
<Grid container spacing={2}>
  <Grid size={{ xs: 12 }}>
```
**Solution**: Migrate all Grid components

### Issue 2: TypeScript 'any' Types
**Problem**: Production build stricter than local
**Solution**: Configure `.eslintrc.json`
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

### Issue 3: Suspense Requirements
**Problem**: `useSearchParams()` requires Suspense
**Solution**: Wrap components
```tsx
<Suspense fallback={<Loading />}>
  <SearchContent />
</Suspense>
```

### Issue 4: Material 3 Web Components
**Problem**: TypeScript doesn't recognize custom elements
**Solution**: Type casting
```typescript
const MdIcon = 'md-icon' as any
```

## Deployment Commands

### AWS Amplify (Recommended)
```bash
# Push to trigger deployment
git add .
git commit -m "deploy: description"
git push origin main

# Monitor build
# Check AWS Amplify Console
```

### Manual Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Domain Configuration

### Gabia DNS Settings
Add these records:
```
Type: A
Name: @
Value: AWS_AMPLIFY_IP

Type: CNAME
Name: www
Value: AWS_AMPLIFY_DOMAIN
```

## Monitoring & Logs

### AWS Amplify
- Build logs: Amplify Console > App > Build
- Access logs: CloudWatch
- Performance: CloudWatch Metrics

### Error Tracking
- Set up error boundaries
- Configure Sentry (optional)
- Monitor Supabase logs

## Docker Development Setup

### Local Testing with Docker
```bash
# Build and run with Docker Compose
docker-compose build app
docker-compose up app

# Access at http://localhost:3000

# Stop containers
docker-compose down
```

### Docker Configuration Files
- `Dockerfile` - Next.js production build
- `docker-compose.yml` - App and PostgreSQL setup
- `.dockerignore` - Excludes unnecessary files

## GitHub Actions Deployment

### Manual Deploy Workflow
1. **Push code to GitHub**
2. **Navigate to Actions tab** in GitHub repository
3. **Select "Manual Deploy to AWS Amplify"**
4. **Click "Run workflow"**
   - Environment: `production`
   - Confirm: Type `deploy`
5. **Click "Run workflow" button**

### Required GitHub Secrets
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AMPLIFY_APP_ID`

## Rollback Procedures

### Quick Rollback
```bash
# Revert last commit
git revert HEAD
git push origin main
```

### Manual Rollback
1. Go to AWS Amplify Console
2. Navigate to deployments
3. Select previous successful build
4. Click "Redeploy this version"

## Performance Optimization

### Build Optimization
```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  images: {
    domains: ['your-supabase-url'],
  },
  experimental: {
    optimizeCss: true,
  }
}
```

### Bundle Size Analysis
```bash
# Analyze bundle
npm run build
npm run analyze
```

## Security Checklist
- [ ] Environment variables secured
- [ ] API keys not in code
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] SSL certificate active
- [ ] Security headers configured

## Post-Deployment Verification

### Functional Tests
1. User registration flow
2. Login/logout
3. Chat functionality
4. File uploads
5. Real-time features

### Performance Tests
- Page load time < 3s
- Time to Interactive < 5s
- Lighthouse score > 80

### SEO Verification
- Meta tags present
- Sitemap accessible
- Robots.txt configured
- Open Graph tags

## Recommended Stack Versions

### Stable (Production)
```json
{
  "next": "14.x",
  "react": "18.x",
  "mui": "5.x"
}
```

### Current (With Workarounds)
```json
{
  "next": "15.x",
  "react": "18.x",
  "mui": "7.x"
}
```

---
*Last Updated: 2025-08-23*