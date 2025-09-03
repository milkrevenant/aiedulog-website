# AWS Amplify Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the AiEduLog Next.js application to AWS Amplify, including troubleshooting common build failures.

## Prerequisites

### Required Environment Variables
Set these in AWS Amplify Console → App Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXTAUTH_SECRET=your-nextauth-secret (optional - will be auto-generated)
NEXTAUTH_URL=https://your-amplify-app-domain.amplifyapp.com
```

### Node.js Version
- **Required**: Node.js 20.x
- **npm Version**: 10.x (specified in package.json engines)
- AWS Amplify should automatically use the correct version

## Deployment Architecture

### Build Process
1. **Pre-build Phase**: Environment setup, dependency installation, validation
2. **Build Phase**: Next.js compilation with production optimizations
3. **Deploy Phase**: Artifact deployment to AWS CloudFront

### Key Features
- **Bulletproof Dependencies**: Always installs packages, even if cache fails
- **Comprehensive Validation**: Verifies Next.js availability before build
- **Error Recovery**: Fallback mechanisms for common failures
- **Security**: Production-ready security headers and CSP
- **Performance**: Optimized for AWS Amplify's constraints

## Build Configuration Explained

### Pre-build Phase
```yaml
preBuild:
  commands:
    # Environment Setup - Validates Node.js environment
    # Environment Variables - Required vars validation with clear errors
    # Clean Installation - Removes conflicting cache, installs fresh dependencies
    # Validation - Verifies Next.js and critical files are ready
```

### Build Phase
```yaml
build:
  commands:
    # Production build with comprehensive error handling
    # Build verification with size reporting
    # Fallback diagnostics if build fails
```

### Caching Strategy
```yaml
cache:
  paths:
    - ~/.npm/**/*          # npm package cache (safe)
    - package-lock.json    # Dependency lock file
    - .next/trace          # Next.js build traces (safe)
    # Excludes: node_modules, .next/cache (causes conflicts)
```

## Troubleshooting Common Issues

### 1. "next: command not found"
**Root Cause**: Dependencies not properly installed
**Solution**: 
- The new amplify.yml includes fallback installation
- Validates Next.js availability before build
- Check AWS Amplify build logs for npm install errors

### 2. Environment Variable Issues
**Symptoms**: Build succeeds but app doesn't work
**Solution**:
- Verify all required env vars are set in Amplify Console
- Check build logs for environment variable validation errors
- Use the AWS Amplify Environment Variables tab, not .env files

### 3. Cache-Related Build Failures
**Symptoms**: Intermittent build failures, especially after successful builds
**Solution**:
- New amplify.yml excludes problematic cache paths
- Clear build cache in Amplify Console if issues persist
- Delete and recreate app if cache corruption persists

### 4. Memory/Timeout Issues
**Symptoms**: Build fails with out-of-memory or timeout errors
**Solution**:
- Next.js config includes AWS Amplify optimizations
- Webpack chunking reduces memory usage
- Build timeout is handled by simplified dependency installation

### 5. TypeScript/ESLint Errors
**Symptoms**: Build fails on type checking
**Solution**:
- Build script uses `--no-lint` flag to skip ESLint during build
- Fix TypeScript errors in development before deploying
- Consider using `type-check` script locally before deploying

## AWS Amplify Console Setup

### 1. Connect Repository
1. Go to AWS Amplify Console
2. Choose "Host web app"
3. Connect your GitHub repository
4. Select the main branch

### 2. Build Settings
The amplify.yml should be automatically detected. If not:
1. Go to App Settings → Build settings
2. Use the amplify.yml from your repository
3. Ensure build image is "Amazon Linux:2023"

### 3. Environment Variables
1. Go to App Settings → Environment variables
2. Add required variables (see Prerequisites)
3. Choose "Apply to all branches"

### 4. Domain Configuration
1. Go to App Settings → Domain management
2. Add your custom domain or use the provided amplifyapp.com domain
3. Configure SSL (automatic with AWS Certificate Manager)

## Performance Optimization

### Next.js Configuration
The `next.config.ts` includes AWS Amplify specific optimizations:
- Standalone output for better cold start performance
- Webpack optimizations for reduced bundle size
- Image optimization for AWS CloudFront
- Security headers for production

### Build Performance
- Dependencies cached between builds (npm cache)
- Parallel processing where possible
- Minimal output for faster deploys
- Trace files cached for incremental builds

## Security Considerations

### Content Security Policy
Production builds include strict CSP headers that allow:
- Self-hosted content
- Supabase API connections
- Google Fonts
- Essential third-party services

### Environment Variables
- Never commit sensitive keys to repository
- Use AWS Amplify Environment Variables for all secrets
- Rotate keys regularly
- Use least-privilege access for API keys

## Monitoring and Debugging

### Build Logs
Access detailed build logs in AWS Amplify Console:
1. Go to your app
2. Click on the failing build
3. Expand "Build logs" sections
4. Look for specific error messages

### Application Monitoring
- AWS CloudWatch logs for runtime errors
- Amplify Console for build and deployment metrics
- Custom error tracking (Sentry, LogRocket, etc.)

### Performance Monitoring
- AWS CloudFront metrics
- Core Web Vitals monitoring
- Custom analytics integration

## Rollback Strategy

### Automatic Rollback
AWS Amplify supports atomic deployments:
- Failed builds don't affect live site
- Previous version remains active until new build succeeds

### Manual Rollback
1. Go to AWS Amplify Console
2. Select your app
3. Choose a previous successful deployment
4. Click "Promote to main"

### Branch-based Deployment
- Use feature branches for testing
- Deploy to staging environment first
- Merge to main only after verification

## Cost Optimization

### Build Efficiency
- Optimized caching reduces build times
- Minimal dependencies in production builds
- Efficient artifact generation

### Hosting Costs
- CloudFront CDN reduces origin requests
- Image optimization reduces bandwidth
- Static asset optimization

### Monitoring Costs
- Set up AWS billing alerts
- Monitor build minute usage
- Optimize build frequency

## Support and Resources

### AWS Amplify Documentation
- [AWS Amplify User Guide](https://docs.aws.amazon.com/amplify/)
- [Next.js on AWS Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html)

### Community Resources
- [AWS Amplify GitHub Discussions](https://github.com/aws-amplify/amplify-cli/discussions)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

### Emergency Contacts
- AWS Support (if you have a support plan)
- Development team escalation path
- Critical incident response procedures