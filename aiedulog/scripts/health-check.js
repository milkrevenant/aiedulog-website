#!/usr/bin/env node

/**
 * DevOps Health Check Script for AiEduLog
 * 
 * Comprehensive diagnostic tool for Next.js static file serving issues
 * and development environment validation.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class HealthChecker {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.issues = [];
        this.warnings = [];
        this.passed = [];
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    logSection(title) {
        this.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
    }

    logPass(message) {
        this.log(`${colors.green}✓${colors.reset} ${message}`);
        this.passed.push(message);
    }

    logWarn(message) {
        this.log(`${colors.yellow}⚠${colors.reset} ${message}`);
        this.warnings.push(message);
    }

    logFail(message) {
        this.log(`${colors.red}✗${colors.reset} ${message}`);
        this.issues.push(message);
    }

    async checkFileExists(filePath, description, required = true) {
        const fullPath = path.join(this.projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
            this.logPass(`${description} exists: ${filePath}`);
            return true;
        } else {
            if (required) {
                this.logFail(`${description} missing: ${filePath}`);
            } else {
                this.logWarn(`${description} not found: ${filePath}`);
            }
            return false;
        }
    }

    async checkNextJsConfig() {
        this.logSection('Next.js Configuration');

        // Check next.config.ts
        if (await this.checkFileExists('next.config.ts', 'Next.js config')) {
            const configPath = path.join(this.projectRoot, 'next.config.ts');
            const configContent = fs.readFileSync(configPath, 'utf8');

            // Check for potential conflicts
            if (configContent.includes('headers()')) {
                if (configContent.includes('_next/static')) {
                    this.logPass('Headers configuration excludes static files');
                } else {
                    this.logWarn('Headers configuration may interfere with static files');
                }
            }

            if (configContent.includes('webpack:')) {
                this.logPass('Webpack configuration present');
            }

            if (configContent.includes('experimental:')) {
                this.logPass('Experimental features configured');
            }
        }

        // Check middleware.ts
        if (await this.checkFileExists('src/middleware.ts', 'Middleware')) {
            const middlewarePath = path.join(this.projectRoot, 'src/middleware.ts');
            const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

            if (middlewareContent.includes('_next/static')) {
                this.logPass('Middleware excludes static files');
            } else {
                this.logFail('Middleware may interfere with static file serving');
            }

            if (middlewareContent.includes('_next/webpack-hmr')) {
                this.logPass('Middleware excludes webpack HMR');
            } else {
                this.logWarn('Middleware may interfere with hot reload');
            }
        }
    }

    async checkEnvironment() {
        this.logSection('Environment Configuration');

        // Check .env.local
        if (await this.checkFileExists('.env.local', 'Environment file')) {
            const envPath = path.join(this.projectRoot, '.env.local');
            const envContent = fs.readFileSync(envPath, 'utf8');

            const requiredVars = [
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
            ];

            requiredVars.forEach(varName => {
                if (envContent.includes(varName)) {
                    this.logPass(`Environment variable ${varName} present`);
                } else {
                    this.logFail(`Missing environment variable: ${varName}`);
                }
            });

            // Check for new vs legacy Supabase keys
            if (envContent.includes('sb_publishable_') || envContent.includes('sb_secret_')) {
                this.logPass('Using new Supabase key format');
            } else if (envContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
                this.logWarn('Using legacy JWT key format - consider upgrading');
            }
        }

        // Check example file
        await this.checkFileExists('.env.example', 'Environment example', false);
    }

    async checkDependencies() {
        this.logSection('Dependencies');

        // Check package.json
        if (await this.checkFileExists('package.json', 'Package configuration')) {
            const packagePath = path.join(this.projectRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            // Check Next.js version
            const nextVersion = packageJson.dependencies?.next;
            if (nextVersion) {
                this.logPass(`Next.js version: ${nextVersion}`);
                
                // Check if it's a compatible version
                if (nextVersion.includes('15.')) {
                    this.logPass('Next.js 15.x detected');
                } else {
                    this.logWarn(`Next.js version may be incompatible: ${nextVersion}`);
                }
            }

            // Check for required dependencies
            const requiredDeps = [
                '@supabase/ssr',
                '@supabase/supabase-js'
            ];

            requiredDeps.forEach(dep => {
                if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
                    this.logPass(`Dependency present: ${dep}`);
                } else {
                    this.logWarn(`Missing dependency: ${dep}`);
                }
            });
        }

        // Check node_modules
        if (await this.checkFileExists('node_modules', 'Node modules directory')) {
            // Check for cache directory
            const cachePath = path.join(this.projectRoot, 'node_modules/.cache');
            if (fs.existsSync(cachePath)) {
                this.logWarn('Node modules cache exists - may cause issues');
            } else {
                this.logPass('Node modules cache clean');
            }
        }
    }

    async checkBuildArtifacts() {
        this.logSection('Build Artifacts');

        const nextPath = path.join(this.projectRoot, '.next');
        if (fs.existsSync(nextPath)) {
            this.logWarn('.next directory exists - development artifacts present');

            // Check static files
            const staticPath = path.join(nextPath, 'static/chunks');
            if (fs.existsSync(staticPath)) {
                try {
                    const files = fs.readdirSync(staticPath);
                    const mainAppFiles = files.filter(f => f.startsWith('main-app'));
                    
                    if (mainAppFiles.length > 0) {
                        this.logPass(`Found ${mainAppFiles.length} main-app chunk(s): ${mainAppFiles.join(', ')}`);
                    }

                    // Check for asset hash consistency
                    const hashedFiles = files.filter(f => f.match(/\w+-[a-f0-9]{12,}\.\w+$/));
                    if (hashedFiles.length > 0) {
                        this.logPass(`Found ${hashedFiles.length} properly hashed assets`);
                    } else {
                        this.logWarn('No properly hashed assets found - may indicate build issues');
                    }
                } catch (error) {
                    this.logFail(`Cannot read static chunks directory: ${error.message}`);
                }
            }
        } else {
            this.logPass('.next directory clean');
        }
    }

    async checkPort() {
        this.logSection('Port Availability');

        const port = 3000;
        try {
            const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || echo ""`);
            if (stdout.trim()) {
                this.logWarn(`Port ${port} is in use by process(es): ${stdout.trim()}`);
                this.logWarn('Run: lsof -ti:3000 | xargs kill -9');
            } else {
                this.logPass(`Port ${port} is available`);
            }
        } catch (error) {
            this.logWarn(`Cannot check port ${port}: ${error.message}`);
        }
    }

    async checkSystemRequirements() {
        this.logSection('System Requirements');

        try {
            const { stdout: nodeVersion } = await execAsync('node --version');
            this.logPass(`Node.js version: ${nodeVersion.trim()}`);

            const { stdout: npmVersion } = await execAsync('npm --version');
            this.logPass(`npm version: ${npmVersion.trim()}`);
        } catch (error) {
            this.logFail(`Cannot check Node.js/npm versions: ${error.message}`);
        }

        // Check OS
        const platform = process.platform;
        this.logPass(`Platform: ${platform}`);

        if (platform === 'darwin') {
            this.logPass('macOS detected - compatible');
        } else if (platform === 'win32') {
            this.logWarn('Windows detected - ensure proper path handling');
        }
    }

    generateReport() {
        this.logSection('Health Check Report');

        this.log(`\n${colors.bold}Summary:${colors.reset}`);
        this.log(`${colors.green}✓ Passed: ${this.passed.length}${colors.reset}`);
        this.log(`${colors.yellow}⚠ Warnings: ${this.warnings.length}${colors.reset}`);
        this.log(`${colors.red}✗ Issues: ${this.issues.length}${colors.reset}`);

        if (this.issues.length > 0) {
            this.log(`\n${colors.bold}${colors.red}Critical Issues:${colors.reset}`);
            this.issues.forEach((issue, index) => {
                this.log(`  ${index + 1}. ${issue}`);
            });
        }

        if (this.warnings.length > 0) {
            this.log(`\n${colors.bold}${colors.yellow}Warnings:${colors.reset}`);
            this.warnings.forEach((warning, index) => {
                this.log(`  ${index + 1}. ${warning}`);
            });
        }

        // Recommendations
        this.log(`\n${colors.bold}${colors.cyan}Recommendations:${colors.reset}`);
        
        if (this.issues.length > 0) {
            this.log('  1. Fix critical issues before starting development');
        }
        
        if (this.warnings.some(w => w.includes('.next directory exists'))) {
            this.log('  2. Run: rm -rf .next && rm -rf node_modules/.cache');
        }
        
        if (this.warnings.some(w => w.includes('Port 3000 is in use'))) {
            this.log('  3. Kill existing processes: lsof -ti:3000 | xargs kill -9');
        }

        this.log('  4. Use the dev-server.sh script for automated environment management');
        this.log('  5. Ensure middleware and next.config.ts properly exclude static files');

        return this.issues.length === 0;
    }

    async run() {
        this.log(`${colors.bold}${colors.blue}🏥 AiEduLog DevOps Health Check${colors.reset}`);
        this.log(`${colors.blue}=====================================${colors.reset}`);

        await this.checkSystemRequirements();
        await this.checkEnvironment();
        await this.checkDependencies();
        await this.checkNextJsConfig();
        await this.checkBuildArtifacts();
        await this.checkPort();

        const isHealthy = this.generateReport();
        
        if (isHealthy) {
            this.log(`\n${colors.bold}${colors.green}🎉 System is healthy and ready for development!${colors.reset}`);
            process.exit(0);
        } else {
            this.log(`\n${colors.bold}${colors.red}🚨 System has critical issues that need to be resolved.${colors.reset}`);
            process.exit(1);
        }
    }
}

// Run the health check
if (require.main === module) {
    const checker = new HealthChecker();
    checker.run().catch(error => {
        console.error(`${colors.red}Health check failed:${colors.reset}`, error);
        process.exit(1);
    });
}

module.exports = HealthChecker;