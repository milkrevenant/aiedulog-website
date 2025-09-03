#!/bin/bash

# AWS Amplify Buildspec Validation Script
# Validates YAML syntax and AWS Amplify compatibility

set -e

echo "Validating AWS Amplify buildspec..."
echo "=================================="

# Check if amplify.yml exists
if [ ! -f "amplify.yml" ]; then
    echo "ERROR: amplify.yml not found"
    exit 1
fi

echo "✅ amplify.yml found"

# Check for problematic patterns
echo "Checking for problematic patterns..."

# Check for multiline blocks
if grep -q "|" amplify.yml; then
    echo "WARNING: Multiline blocks (|) detected - may cause AWS parsing issues"
    grep -n "|" amplify.yml
else
    echo "✅ No multiline blocks found"
fi

# Check for Unicode/emoji characters - focus on actual problematic chars
if grep -q '[🎉🚀✅❌⚠️🔍🛡️🎯]' amplify.yml; then
    echo "ERROR: Emoji characters detected (can break AWS parsing)"
    grep -n '[🎉🚀✅❌⚠️🔍🛡️🎯]' amplify.yml
    exit 1
else
    echo "✅ No problematic Unicode characters found"
fi

# Check for unquoted commands with colons
if grep -E "^\s*- [^\"'].*:" amplify.yml > /dev/null; then
    echo "WARNING: Potentially unquoted commands with colons detected"
    grep -nE "^\s*- [^\"'].*:" amplify.yml
else
    echo "✅ No unquoted colon commands found"
fi

# Validate YAML syntax (if available)
if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import yaml; yaml.safe_load(open('amplify.yml'))" 2>/dev/null; then
        echo "✅ YAML syntax is valid"
    else
        echo "ERROR: Invalid YAML syntax"
        exit 1
    fi
else
    echo "⚠️ Python not available - skipping YAML syntax validation"
fi

# Check required structure
if grep -q "version: 1" amplify.yml && grep -q "applications:" amplify.yml; then
    echo "✅ Required AWS Amplify structure found"
else
    echo "ERROR: Missing required AWS Amplify structure"
    exit 1
fi

# Check for required commands
required_commands=("npm" "node" "echo")
for cmd in "${required_commands[@]}"; do
    if grep -q "$cmd" amplify.yml; then
        echo "✅ $cmd command found in buildspec"
    else
        echo "WARNING: $cmd command not found in buildspec"
    fi
done

echo ""
echo "🎉 Amplify buildspec validation completed successfully!"
echo "Your buildspec should work reliably with AWS Amplify."