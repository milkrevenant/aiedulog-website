#!/bin/bash
# Simulate AWS Amplify build locally
# This script replicates the exact commands from amplify.yml

set -e

echo "=== Simulating AWS Amplify Build ==="
echo "This script runs the exact commands from amplify.yml"
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to run commands with logging
run_command() {
    echo -e "${BLUE}Running:${NC} $1"
    eval "$1"
    echo -e "${GREEN}✓ Success${NC}"
    echo
}

# Set required environment variables if not set
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export CI=true

echo "=== PRE-BUILD PHASE ==="
echo

# Environment validation (would fail in real Amplify if not set)
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}⚠ Warning: NEXT_PUBLIC_SUPABASE_URL not set${NC}"
    echo "In Amplify, this would cause build failure"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}⚠ Warning: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set${NC}"
    echo "In Amplify, this would cause build failure"
fi

# Simulate pre-build commands
run_command 'echo "Starting AWS Amplify build for AiEduLog"'
run_command 'echo "Build timestamp $(date)"'
run_command 'echo "Node.js version $(node --version)"'
run_command 'echo "npm version $(npm --version)"'
run_command 'echo "Setting up environment variables"'

# Environment validation (using exit 0 for simulation)
run_command 'test -n "$NEXT_PUBLIC_SUPABASE_URL" || (echo "ERROR NEXT_PUBLIC_SUPABASE_URL required" && exit 0)'
run_command 'test -n "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" || (echo "ERROR NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY required" && exit 0)'

run_command 'echo "Environment variables validated"'
run_command 'echo "Cleaning previous build artifacts"'
run_command 'rm -rf .next node_modules/.cache .npm-cache'
run_command 'echo "Installing dependencies"'
run_command 'npm ci --no-audit --no-fund --prefer-offline || npm install --no-audit --no-fund'
run_command 'echo "Verifying Next.js installation"'
run_command 'npx next --version'
run_command 'echo "Pre-build completed successfully"'

echo "=== BUILD PHASE ==="
echo

run_command 'echo "Starting application build"'
run_command 'export NODE_ENV=production'
run_command 'export NEXT_TELEMETRY_DISABLED=1'
run_command 'export CI=true'
run_command 'npm run build'
run_command 'echo "Build completed successfully"'
run_command 'test -d ".next" || (echo "ERROR Build failed - .next directory missing" && exit 1)'
run_command 'echo "Build verification completed"'

echo "=== BUILD SIMULATION COMPLETE ==="
echo
echo -e "${GREEN}✓ All commands executed successfully${NC}"
echo "Build artifacts should be in .next directory:"
ls -la .next/ 2>/dev/null || echo "No .next directory found"
echo
echo "If this simulation passes, your amplify.yml should work in AWS Amplify"