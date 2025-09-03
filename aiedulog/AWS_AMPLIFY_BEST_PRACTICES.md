# AWS Amplify Best Practices & Troubleshooting Guide

## 🎯 Critical Success Factors

### 1. YAML Syntax Requirements

**ALWAYS AVOID:**
- ❌ Multiline blocks (`|` operator)
- ❌ Unicode characters (emojis, special symbols)
- ❌ Complex nested shell scripts
- ❌ Unquoted special characters

**ALWAYS USE:**
- ✅ Simple, single-line commands
- ✅ ASCII-only characters
- ✅ Proper indentation (2 spaces)
- ✅ Quoted strings with special characters

### 2. Command Structure Best Practices

**Reliable Patterns:**
```yaml
# Good: Simple commands
- echo "Starting build"
- npm install
- npm run build

# Good: Simple conditionals
- test -f package.json || exit 1
- command -v node || exit 1

# Good: Environment variable checks
- test -n "$VAR" || (echo "Missing VAR" && exit 1)
```

**Avoid These Patterns:**
```yaml
# Bad: Multiline blocks
- |
  if [ condition ]; then
    complex logic
  fi

# Bad: Unicode characters
- echo "🚀 Starting build"

# Bad: Complex shell constructs
- for file in *.js; do process $file; done
```

### 3. Bulletproof Build Strategy

**Phase 1: Environment Setup**
- Validate Node.js/npm versions
- Check required environment variables
- Verify critical files exist

**Phase 2: Dependency Management**
- Use `npm ci` for faster, reliable installs
- Fallback to `npm install` if needed
- Verify installation success

**Phase 3: Build Execution**
- Set production environment variables
- Run build with proper error handling
- Validate build output

**Phase 4: Artifact Preparation**
- Verify `.next` directory exists
- Check build artifacts are complete
- Prepare for deployment

## 🔧 Environment Variables

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

**Optional but Recommended:**
```
NEXTAUTH_SECRET=auto-generated-or-custom
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
CI=true
```

## 🏗️ Build Configuration

### Minimal amplify.yml (Recommended)
```yaml
version: 1
applications:
  - appRoot: aiedulog
    frontend:
      phases:
        preBuild:
          commands:
            - echo "Starting AWS Amplify build"
            - test -n "$NEXT_PUBLIC_SUPABASE_URL" || exit 1
            - test -n "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" || exit 1
            - rm -rf .next node_modules/.cache
            - npm ci --no-audit --no-fund || npm install
            - npx next --version
        build:
          commands:
            - export NODE_ENV=production
            - export NEXT_TELEMETRY_DISABLED=1
            - npm run build
            - test -d .next || exit 1
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - ~/.npm/**/*
          - package-lock.json
```

### Common Error Patterns & Solutions

**Error: "buildspec malformed"**
- **Cause:** Unicode characters, multiline blocks, or complex YAML
- **Solution:** Use simple, ASCII-only commands

**Error: "commands provided in the buildspec are malformed"**
- **Cause:** Unquoted strings with special characters
- **Solution:** Quote all echo statements and complex commands

**Error: "Module not found"**
- **Cause:** Dependencies not installed properly
- **Solution:** Use `npm ci` with fallback to `npm install`

**Error: "Build failed"**
- **Cause:** Missing environment variables or build errors
- **Solution:** Add proper validation and error messages

## 🧪 Testing Strategy

### 1. Local Validation
```bash
# Validate YAML syntax
python3 -c "import yaml; yaml.safe_load(open('amplify.yml', 'r'))"

# Run validation script
bash scripts/validate-amplify.sh

# Simulate build locally
npm run amplify:simulate
```

### 2. Pre-deployment Checklist
- [ ] YAML syntax validated
- [ ] No Unicode characters
- [ ] Environment variables configured in Amplify Console
- [ ] Build commands tested locally
- [ ] All required files present

### 3. Debugging Failed Builds
1. Check Amplify Console build logs
2. Look for specific error messages
3. Test commands locally in same order
4. Validate environment variables are set
5. Check for missing dependencies

## 📊 Performance Optimizations

### Cache Strategy
```yaml
cache:
  paths:
    - ~/.npm/**/*        # npm cache
    - package-lock.json  # dependency lockfile
    - .next/trace        # Next.js traces (safe to cache)
```

**Do NOT cache:**
- `node_modules` (platform-specific)
- `.next/cache` (can cause 404 errors)
- `.next/static` (included in artifacts)

### Build Speed Tips
- Use `npm ci` instead of `npm install`
- Enable npm caching
- Disable telemetry with `NEXT_TELEMETRY_DISABLED=1`
- Use `--no-audit --no-fund` flags

## 🚨 Emergency Fallback

If builds consistently fail, use this minimal configuration:

```yaml
version: 1
applications:
  - appRoot: aiedulog
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
```

## 📝 Validation Commands

```bash
# Check current configuration
bash scripts/validate-amplify.sh

# Test build locally (simulates Amplify environment)
NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 CI=true npm run build

# Validate YAML in multiple parsers
python3 -c "import yaml; print(yaml.safe_load(open('amplify.yml')))"
ruby -ryaml -e "puts YAML.load_file('amplify.yml')"
```

## 🎯 Success Metrics

**Build should complete within:**
- Pre-build phase: < 3 minutes
- Build phase: < 5 minutes
- Total build time: < 10 minutes

**Key indicators of success:**
- All validation steps pass
- `.next` directory created
- No YAML parsing errors
- Environment variables properly resolved
- Dependencies installed successfully

---

**Remember:** Simplicity beats complexity. A working basic build is better than a complex broken one.