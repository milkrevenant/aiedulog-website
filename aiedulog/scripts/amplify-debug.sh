#!/bin/bash

# AWS Amplify Debug Script
# Simulates AWS Amplify build environment for local debugging

set -e  # Exit on any error

echo "🔍 AWS Amplify Build Environment Debug Script"
echo "=============================================="

# Check Node.js version
echo "📋 Checking Node.js environment..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: package.json not found. Please run from project root."
    exit 1
fi

# Simulate AWS Amplify preBuild phase
echo "🚀 Simulating AWS Amplify preBuild phase..."

echo "🧹 Cleaning build cache..."
rm -rf .next/cache .next/standalone node_modules/.cache

echo "📦 Installing dependencies..."
if npm ci --no-audit --no-fund --prefer-offline; then
    echo "✅ Dependencies installed successfully with npm ci"
else
    echo "⚠️ npm ci failed, trying npm install as fallback"
    rm -rf node_modules package-lock.json
    npm install --no-audit --no-fund
    echo "✅ Dependencies installed with npm install"
fi

echo "🔍 Validating Next.js installation..."
if ! command -v npx >/dev/null 2>&1; then
    echo "❌ ERROR: npx not available"
    exit 1
fi

if ! npx next --version >/dev/null 2>&1; then
    echo "❌ ERROR: Next.js not properly installed"
    echo "Installed packages:"
    npm list next || echo "Next.js not found in dependencies"
    exit 1
fi

NEXTJS_VERSION=$(npx next --version)
echo "✅ Next.js ${NEXTJS_VERSION} is ready"

echo "📁 Verifying critical files..."
critical_files=("next.config.ts" "src/app/layout.tsx" "tsconfig.json")
for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ ERROR: Critical file missing: $file"
        exit 1
    fi
done
echo "✅ All critical files present"

# Simulate build phase
echo "🏗️ Simulating AWS Amplify build phase..."
echo "Building application..."
echo "Node version: $(node --version)"
echo "Build environment: ${NODE_ENV:-development}"

# Test build
if npm run build; then
    echo "✅ Build completed successfully"
    
    # Verify build output
    if [ ! -d ".next" ]; then
        echo "❌ ERROR: Build failed - .next directory not created"
        exit 1
    fi
    echo "✅ Build output verified"
else
    echo "❌ ERROR: Build failed"
    exit 1
fi

echo "🎉 AWS Amplify simulation completed successfully!"
echo ""
echo "📋 Build Summary:"
echo "- Node.js: $(node --version)"
echo "- Next.js: ${NEXTJS_VERSION}"
echo "- Build directory: .next"
echo "- Status: Ready for deployment"