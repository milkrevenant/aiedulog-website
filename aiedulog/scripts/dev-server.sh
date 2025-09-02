#!/bin/bash

# DevOps Development Server Management Script
# Comprehensive solution for Next.js static file serving issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=3000
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_ENV=${NODE_ENV:-development}

echo -e "${BLUE}🚀 AiEduLog DevOps Development Server Manager${NC}"
echo -e "${BLUE}=========================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to kill processes on port
kill_port() {
    local port=$1
    echo "🔍 Checking for processes on port $port..."
    
    # For macOS/Linux
    if command -v lsof >/dev/null 2>&1; then
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            print_warning "Killing existing processes on port $port: $pids"
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 2
        else
            print_status "No processes found on port $port"
        fi
    fi
}

# Function to clean development environment
clean_environment() {
    echo "🧹 Cleaning development environment..."
    
    cd "$PROJECT_DIR"
    
    # Remove Next.js build artifacts
    if [ -d ".next" ]; then
        print_status "Removing .next directory"
        rm -rf .next
    fi
    
    # Remove Node.js cache
    if [ -d "node_modules/.cache" ]; then
        print_status "Removing node_modules/.cache"
        rm -rf node_modules/.cache
    fi
    
    # Remove npm cache (optional)
    if [ "$1" = "--deep" ]; then
        print_status "Clearing npm cache"
        npm cache clean --force 2>/dev/null || true
    fi
    
    # Remove temporary files
    find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    
    print_status "Environment cleaned"
}

# Function to check dependencies
check_dependencies() {
    echo "📦 Checking dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Check if node_modules exists and is valid
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        print_warning "Installing/updating dependencies"
        npm install
        print_status "Dependencies installed"
    else
        print_status "Dependencies are up to date"
    fi
}

# Function to validate configuration
validate_config() {
    echo "⚙️ Validating configuration..."
    
    cd "$PROJECT_DIR"
    
    # Check environment variables
    if [ ! -f ".env.local" ]; then
        print_error "Missing .env.local file"
        exit 1
    fi
    
    # Check required files
    local required_files=("next.config.ts" "src/middleware.ts" "package.json")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Missing required file: $file"
            exit 1
        fi
    done
    
    print_status "Configuration validated"
}

# Function to start development server
start_server() {
    echo "🚀 Starting development server..."
    
    cd "$PROJECT_DIR"
    
    # Set optimal Node.js flags for development
    export NODE_OPTIONS="--max-old-space-size=4096 --inspect=0.0.0.0:9229"
    export FORCE_COLOR=1
    
    print_status "Starting Next.js development server on port $PORT"
    print_status "Environment: $NODE_ENV"
    print_status "Project: $PROJECT_DIR"
    
    # Start the server with detailed logging
    echo -e "${BLUE}📊 Server logs:${NC}"
    npm run dev
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --clean, -c       Clean environment only"
    echo "  --deep-clean, -d  Deep clean (includes npm cache)"
    echo "  --check, -k       Check dependencies only"
    echo "  --validate, -v    Validate configuration only"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Default: Clean environment and start development server"
}

# Main script logic
main() {
    case "${1:-}" in
        --clean|-c)
            clean_environment
            ;;
        --deep-clean|-d)
            clean_environment --deep
            ;;
        --check|-k)
            check_dependencies
            ;;
        --validate|-v)
            validate_config
            ;;
        --help|-h)
            show_help
            ;;
        "")
            # Default: Full development server startup
            kill_port $PORT
            clean_environment
            check_dependencies
            validate_config
            start_server
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap to clean up on exit
trap 'echo -e "\n${YELLOW}🛑 Development server stopped${NC}"' EXIT

# Run main function
main "$@"