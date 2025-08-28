# 🚀 AWS Ultimate Migration Guide: From Slow to Fast
## Complete Amplify/Supabase → EC2/RDS Migration Documentation

---

# 📊 Part 1: Performance Analysis & Problem Diagnosis

## 🔴 Current Performance Issues

### Why Your Site is Slow (900ms+ TTFB)
```
User Request (Korea)
    ↓ +150ms (Geographic - Amplify in US)
AWS CloudFront (US)
    ↓ +200ms (Cold start - Lambda@Edge)
Lambda Function
    ↓ +100ms (Function execution)
Supabase API Call
    ↓ +200ms (Database query)
Response Processing
    ↓ +100ms (SSR rendering)
Return to User
= Total: 750ms+ for first byte
```

### Amplify-Specific Problems
1. **Cold Starts**: 5-10 second first visit (Lambda@Edge)
2. **Wrong Region**: US servers for Korean users (+150-200ms)
3. **SSR Overhead**: Every request through Lambda (+300ms)
4. **Bundle Size**: 4-5MB (MUI + Excalidraw + Maps)
5. **No Image Optimization**: Full size downloads

### Supabase-Specific Problems
1. **Free Tier Cold Starts**: Database sleeps after inactivity
2. **Shared Resources**: CPU/RAM shared with other users
3. **Connection Limits**: Minimal connection pool on free tier
4. **Geographic Distance**: Unknown region location

---

# 🎯 Part 2: Migration Strategy & Options

## Architecture Comparison

### Current Architecture (Slow)
```
Users (Korea) → Amplify (US) → Lambda@Edge → Supabase (Unknown)
Latency: 900ms+ | Cold Starts: Yes | Cost: $25+/mo
```

### Target Architecture (Fast)
```
Users (Korea) → CloudFlare → EC2 (Seoul) → RDS (Seoul) + Redis
Latency: 50ms | Cold Starts: No | Cost: $35/mo
```

## Database Options Analysis

### Option A: RDS PostgreSQL ✅ (Recommended)
**Perfect for aiedulog because:**
- Direct migration (both PostgreSQL)
- Keep existing schema, queries, relationships
- Complex queries with JOINs supported
- ACID transactions maintained
- 20-50ms query response

**Example - Your Feed Query:**
```sql
-- One query in PostgreSQL (RDS)
SELECT p.*, u.username, u.avatar, 
       COUNT(l.id) as like_count,
       EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND post_id = p.id) as user_liked
FROM posts p
JOIN user_profiles u ON p.poster_id = u.id
LEFT JOIN likes l ON p.id = l.post_id
WHERE p.poster_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
GROUP BY p.id, u.username, u.avatar
ORDER BY p.created_at DESC
LIMIT 20;
```

### Option B: DynamoDB ❌ (Not Suitable)
**Wrong for social platforms because:**
- NoSQL requires complete rewrite
- No JOINs (multiple queries needed)
- No cross-table transactions
- Would need 5+ queries for feed
- Actually SLOWER for complex queries

### Option C: Stay on Supabase Pro 🤔 (Temporary)
**Consider if < 100 daily users:**
- $25/month fixes cold starts
- No code changes needed
- Keep auth system
- Upgrade takes 5 minutes
- Performance: 50-100ms queries

## Hosting Platform Comparison

| Platform | Performance | Cost/Month | Setup Time | Best For |
|----------|------------|------------|------------|----------|
| **Amplify** (current) | Slow (900ms) | $5-15 | Done | ❌ Nobody |
| **EC2** (recommended) | Fast (50ms) | $0-35 | 2-3 days | ✅ Your case |
| **Vercel** | Fast (100ms) | $20 | 10 min | Quick fix |
| **Cloudflare Pages** | Fast (80ms) | $0-20 | 1 hour | Static sites |

---

# 🔧 Part 3: Quick Optimizations (Before Migration)

## Immediate Amplify Improvements (Do Today)

### 1. Enable CloudFront Performance
```bash
amplify update hosting
# Select "Performance mode (CloudFront)"
amplify push
```

### 2. Code Split Heavy Components
```typescript
// src/components/HeavyComponents.tsx
import dynamic from 'next/dynamic'

const ExcalidrawWrapper = dynamic(
  () => import('@excalidraw/excalidraw'),
  { ssr: false, loading: () => <Skeleton /> }
)

const GoogleMap = dynamic(
  () => import('@react-google-maps/api').then(mod => mod.GoogleMap),
  { ssr: false }
)
```

### 3. Static Generation for Public Pages
```typescript
// app/aboutus/page.tsx
export const dynamic = 'force-static'

// app/main/page.tsx  
export const dynamic = 'force-static'

// app/feed/page.tsx (with ISR)
export const revalidate = 10 // Regenerate every 10 seconds
```

### 4. Database Indexes (Run in Supabase SQL Editor)
```sql
-- Immediate performance boost
CREATE INDEX idx_posts_created_desc ON posts(created_at DESC);
CREATE INDEX idx_posts_user_created ON posts(poster_id, created_at DESC);
CREATE INDEX idx_user_profiles_identity ON user_profiles(identity_id);
```

---

# 📋 Part 4: Complete Migration Implementation

## Prerequisites & Account Info
- **AWS Account**: [YOUR-AWS-ACCOUNT-NAME]
- **Region**: ap-northeast-2 (Seoul)
- **EC2 Instance**: `[YOUR-INSTANCE-ID]` (Create t3.micro)
- **VPC**: `[YOUR-VPC-ID]` (Use default or create new)
- **Key Pair**: `[YOUR-KEY-NAME].pem` (Download and save securely)
- **GitHub**: [YOUR-GITHUB-REPO]

## 📅 Day 1: Infrastructure Setup

### Step 1.1: Access Your EC2
```bash
# Connect to existing instance
ssh -i ~/.ssh/aws/[YOUR-KEY-NAME].pem ubuntu@[YOUR-EC2-PUBLIC-IP]
```

### Step 1.2: Install Required Software
```bash
#!/bin/bash
# System update
sudo apt update && sudo apt upgrade -y

# Node.js 20 (IMPORTANT: Use v20, not v18)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Essential packages
sudo apt install -y nginx redis-server postgresql-client git
sudo npm install -g pm2

# Start services
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify everything
node -v  # Should show v20.x.x
redis-cli ping  # Should return PONG
nginx -v
pm2 -v
```

### Step 1.3: Create RDS Instance

**AWS Console → RDS → Create Database:**

```yaml
Engine Settings:
  Engine: PostgreSQL 15.4
  Template: Free tier

Database Settings:
  DB Instance ID: aiedulog-database
  Master Username: postgres
  Master Password: [GENERATE 20+ chars]
  
Instance:
  Class: db.t3.micro (free tier)
  
Storage:
  Type: General Purpose SSD (gp2)
  Size: 20 GB
  Autoscaling: Disabled
  
Connectivity:
  VPC: [YOUR-VPC-ID] (same as EC2)
  Subnet Group: Create new (all AZs)
  Public Access: No
  Security Group: Create new → aiedulog-rds-sg
  Port: 5432
  
Additional:
  Initial Database: aiedulog
  Backup: 7 days retention
  Encryption: Enable
  Backup Window: 03:00-04:00 UTC
```

### Step 1.4: Security Groups Configuration

**RDS Security Group (aiedulog-rds-sg):**
```yaml
Inbound Rules:
  Type: PostgreSQL
  Protocol: TCP
  Port: 5432
  Source: [Your EC2 Security Group ID]
  Description: Allow EC2 access only
```

**EC2 Security Group (existing):**
```yaml
Verify these rules:
  SSH (22): Your IP
  HTTP (80): 0.0.0.0/0
  HTTPS (443): 0.0.0.0/0
  Custom TCP (3000): Your IP (testing)
```

### Step 1.5: Test RDS Connection
```bash
# Wait 10 minutes for RDS to initialize
# Get endpoint from AWS Console (aiedulog-database.xxxxx.rds.amazonaws.com)

psql \
  --host=aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com \
  --port=5432 \
  --username=postgres \
  --dbname=aiedulog

# Success = aiedulog=> prompt
# Type \q to exit
```

## 📅 Day 2: Database Migration

### Step 2.1: Export Supabase Data (Local Machine)
```bash
# Create workspace
mkdir ~/aiedulog-migration
cd ~/aiedulog-migration

# Get connection from Supabase Dashboard → Settings → Database

# Export schema
pg_dump \
  --host=[SUPABASE-HOST] \
  --port=6543 \
  --username=postgres.[PROJECT-REF] \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-comments \
  --schema-only \
  > schema.sql

# Export data
pg_dump \
  --host=[SUPABASE-HOST] \
  --port=6543 \
  --username=postgres.[PROJECT-REF] \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --data-only \
  --exclude-table='auth.*' \
  --exclude-table='storage.*' \
  > data.sql

# Clean Supabase-specific elements
sed -i '' '/POLICY/d' schema.sql
sed -i '' '/ROW LEVEL SECURITY/d' schema.sql
sed -i '' '/ALTER DEFAULT PRIVILEGES/d' schema.sql
```

### Step 2.2: Import to RDS
```bash
# Transfer files to EC2
scp -i ~/.ssh/aws/[YOUR-KEY-NAME].pem schema.sql data.sql ubuntu@[EC2-IP]:~/

# SSH to EC2
ssh -i ~/.ssh/aws/[YOUR-KEY-NAME].pem ubuntu@[EC2-IP]

# Import schema
psql \
  --host=aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com \
  --username=postgres \
  --dbname=aiedulog \
  < schema.sql

# Import data
psql \
  --host=aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com \
  --username=postgres \
  --dbname=aiedulog \
  < data.sql
```

### Step 2.3: Optimize Database Performance
```sql
psql \
  --host=aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com \
  --username=postgres \
  --dbname=aiedulog << EOF

-- Critical performance indexes
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_user_published ON posts(poster_id, is_published);
CREATE INDEX idx_posts_user_created ON posts(poster_id, created_at DESC);
CREATE INDEX idx_user_profiles_identity ON user_profiles(identity_id);
CREATE INDEX idx_auth_methods_provider ON auth_methods(provider, provider_user_id);
CREATE INDEX idx_identities_user ON identities(user_id);
CREATE INDEX idx_profiles_role ON user_profiles(role) WHERE role != 'member';

-- Performance view (optional but recommended)
CREATE MATERIALIZED VIEW user_permission_cache AS
SELECT 
  user_id,
  bool_or(role = 'admin') as is_admin,
  bool_or(role = 'moderator') as is_moderator,
  array_agg(DISTINCT role) as roles
FROM user_profiles
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_permission_cache(user_id);

-- Analyze for query planner
ANALYZE;
EOF
```

### Step 2.4: Setup Auth Tables (Replace Supabase Auth)
```sql
psql \
  --host=aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com \
  --username=postgres \
  --dbname=aiedulog << EOF

-- Auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Users table
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table  
CREATE TABLE IF NOT EXISTS auth.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auth_sessions_token ON auth.sessions(token);
CREATE INDEX idx_auth_sessions_user ON auth.sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth.sessions(expires_at);

-- Migrate existing users
INSERT INTO auth.users (id, email, email_confirmed_at, created_at)
SELECT DISTINCT
  am.provider_user_id::uuid,
  am.provider_account_id,
  NOW(),
  COALESCE(i.created_at, NOW())
FROM auth_methods am
JOIN identities i ON i.id = am.identity_id
WHERE am.provider = 'supabase'
ON CONFLICT (id) DO NOTHING;

EOF
```

## 📅 Day 3: Application Deployment

### Step 3.1: Clone and Setup Project
```bash
# On EC2
cd /home/ubuntu
git clone [YOUR-GITHUB-REPO-URL]
cd [YOUR-PROJECT-FOLDER]

# Install dependencies
npm install

# Additional packages for AWS
npm install pg jsonwebtoken bcrypt ioredis @aws-sdk/client-secrets-manager
```

### Step 3.2: Create Database Layer
```bash
# Database configuration
cat > src/lib/db/index.ts << 'EOF'
import { Pool } from 'pg'
import Redis from 'ioredis'

// PostgreSQL pool
export const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Redis cache
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
})

// Cache helper
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  
  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
}

// Usage: const stats = await getCached('stats:dashboard', fetchStats, 3600)
EOF
```

### Step 3.3: Create Auth Service
```bash
cat > src/lib/auth/jwt-service.ts << 'EOF'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET!

export class AuthService {
  static async createSession(userId: string) {
    const token = jwt.sign(
      { userId, type: 'access' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)
    
    await db.query(
      'INSERT INTO auth.sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expires]
    )
    
    return token
  }
  
  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      const result = await db.query(
        'SELECT * FROM auth.sessions WHERE token = $1 AND expires_at > NOW()',
        [token]
      )
      
      if (result.rows.length === 0) {
        throw new Error('Invalid session')
      }
      
      return decoded
    } catch {
      return null
    }
  }
  
  static async login(email: string, password: string) {
    const userResult = await db.query(
      'SELECT * FROM auth.users WHERE email = $1',
      [email]
    )
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found')
    }
    
    const user = userResult.rows[0]
    const valid = await bcrypt.compare(password, user.encrypted_password)
    
    if (!valid) {
      throw new Error('Invalid password')
    }
    
    const token = await this.createSession(user.id)
    return { user, token }
  }
}
EOF
```

### Step 3.4: Environment Variables
```bash
# Production environment
cat > .env.production << EOF
# Database (RDS)
DB_HOST=aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=aiedulog
DB_USER=postgres
DB_PASSWORD=[YOUR-RDS-PASSWORD]
DATABASE_URL=postgresql://postgres:[PASSWORD]@[RDS-ENDPOINT]:5432/aiedulog

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://aiedulog.com

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://aiedulog.com

# Keep temporarily for gradual migration
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[YOUR-KEY]
EOF
```

### Step 3.5: Build and Deploy
```bash
# Build application
npm run build

# Create PM2 ecosystem
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aiedulog',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 2,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Execute the command that pm2 startup outputs
```

### Step 3.6: Configure Nginx
```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/aiedulog << 'EOF'
server {
    listen 80;
    server_name aiedulog.com www.aiedulog.com;

    # Gzip
    gzip on;
    gzip_types text/plain application/javascript text/css application/json;
    gzip_min_length 1000;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static {
        proxy_cache STATIC;
        proxy_pass http://localhost:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    location /images {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/aiedulog /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 📅 Day 4: Testing & Optimization

### Step 4.1: Test Application
```bash
# Test Next.js
curl http://localhost:3000

# Test Nginx
curl http://localhost

# Check PM2
pm2 status
pm2 logs aiedulog --lines 100
pm2 monit

# Monitor performance
htop
```

### Step 4.2: Allocate Elastic IP
```yaml
AWS Console:
1. EC2 → Elastic IPs → Allocate
2. Actions → Associate IP
3. Select: [YOUR-INSTANCE-ID]
4. Save IP for DNS update
```

### Step 4.3: Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test config
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Homepage"
    flow:
      - get:
          url: "/"
  - name: "Dashboard"
    flow:
      - get:
          url: "/dashboard"
EOF

# Run test
artillery run load-test.yml

# Alternative: autocannon
npm install -g autocannon
autocannon -c 10 -d 30 http://localhost:3000
```

### Step 4.4: SSL Certificate
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (after DNS update)
sudo certbot --nginx -d aiedulog.com -d www.aiedulog.com

# Test renewal
sudo certbot renew --dry-run
```

## 📅 Day 5: Go Live!

### Step 5.1: Update DNS
```yaml
Domain Registrar Settings:
Type: A
Name: @ (or aiedulog.com)
Value: [YOUR-ELASTIC-IP]
TTL: 300

Type: A
Name: www
Value: [YOUR-ELASTIC-IP]
TTL: 300
```

### Step 5.2: Monitoring Setup
```bash
# Health check script
cat > ~/health-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://aiedulog.com)
timestamp=$(date "+%Y-%m-%d %H:%M:%S")

if [ $response -ne 200 ]; then
    echo "$timestamp: Site DOWN! Response: $response" >> ~/health-check.log
    # Add notification (email/SMS)
else
    echo "$timestamp: Site OK ($response)" >> ~/health-check.log
fi
EOF

chmod +x ~/health-check.sh

# Schedule checks
crontab -e
# Add: */5 * * * * /home/ubuntu/health-check.sh
```

### Step 5.3: Backup Automation
```bash
# Backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Database backup
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h aiedulog-database.xxxxx.ap-northeast-2.rds.amazonaws.com \
  -U postgres \
  -d aiedulog \
  > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://aiedulog-backups/

# Keep only 7 days locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x ~/backup-db.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### Step 5.4: CloudWatch Monitoring (Optional)
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure (interactive)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

---

# 🚨 Part 5: Troubleshooting Guide

## Common Issues & Solutions

### EC2 Connection Failed
```bash
# Fix SSH key permissions
chmod 400 ~/.ssh/aws/[YOUR-KEY-NAME].pem

# Check security group
# Ensure port 22 is open to your IP

# Alternative connection method
ssh -i [YOUR-KEY-NAME].pem ubuntu@[EC2-IP] -v
```

### RDS Connection Failed
```bash
# From EC2, test connection
psql --host=[RDS-ENDPOINT] --username=postgres --dbname=aiedulog

# Common issues:
# 1. Security group - RDS must allow EC2 security group
# 2. Wrong endpoint - copy from RDS console
# 3. Database not created - check "aiedulog" exists

# Test with telnet
telnet [RDS-ENDPOINT] 5432
```

### PM2 Issues
```bash
# App crashed
pm2 status
pm2 logs aiedulog --err
pm2 restart aiedulog

# High memory usage
pm2 reload aiedulog
pm2 reset aiedulog  # Reset logs

# Not starting on boot
pm2 startup
pm2 save
```

### 502 Bad Gateway
```bash
# Check if app is running
pm2 list
curl http://localhost:3000

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Restart everything
pm2 restart all
sudo systemctl restart nginx
```

### High Database Latency
```sql
-- Check slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Missing indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Table bloat
VACUUM ANALYZE;
```

### Redis Issues
```bash
# Check if running
redis-cli ping

# Monitor commands
redis-cli monitor

# Clear cache
redis-cli FLUSHALL

# Check memory
redis-cli INFO memory
```

---

# 📊 Part 6: Performance Metrics & Monitoring

## Expected Performance Improvements

| Metric | Before (Amplify) | After (EC2) | Improvement |
|--------|-----------------|-------------|-------------|
| **TTFB** | 900ms+ | 50ms | **18x faster** |
| **Cold Starts** | 5-10 seconds | None | **∞ better** |
| **Geographic Latency** | 200ms | 10ms | **20x faster** |
| **Database Query** | 200-300ms | 20-50ms | **10x faster** |
| **Homepage Load** | 5-10s | 0.5-1s | **10x faster** |
| **Dashboard Load** | 3-5s | 0.8-1.2s | **4x faster** |
| **Concurrent Users** | ~50 | 500+ | **10x more** |

## Success Criteria Checklist

### Performance Goals
- [ ] Homepage loads < 1 second
- [ ] Dashboard loads < 1.5 seconds
- [ ] API responses < 200ms
- [ ] No cold starts
- [ ] Redis cache hit rate > 80%
- [ ] Database queries < 50ms

### Technical Requirements
- [ ] All user data migrated
- [ ] Authentication working (JWT)
- [ ] SSL certificate active
- [ ] Monitoring active
- [ ] Backups automated
- [ ] Error logging configured

---

# 💰 Part 7: Cost Analysis

## Monthly Cost Breakdown

### During Free Tier (First 12 Months)
| Service | Usage | Cost |
|---------|-------|------|
| EC2 t3.micro | 750 hrs | $0 |
| RDS db.t3.micro | 750 hrs | $0 |
| EBS 30GB | 30GB | $0 |
| Data Transfer | 15GB | $0 |
| **Total** | | **$0** |

### After Free Tier
| Service | Cost |
|---------|------|
| EC2 t3.micro | $8.50 |
| RDS db.t3.micro | $15.00 |
| EBS Storage | $3.00 |
| Data Transfer | $9.00 |
| Elastic IP | $3.60 |
| Backups (S3) | $1.00 |
| **Total** | **~$40/month** |

### Cost Comparison
| Solution | Monthly Cost | Performance |
|----------|-------------|-------------|
| Amplify + Supabase Free | $5-15 | Very Slow |
| Amplify + Supabase Pro | $30-40 | Slow |
| **EC2 + RDS** | $0-40 | **Fast** |
| Vercel Pro + Supabase Pro | $45 | Fast |

---

# 🔄 Part 8: Rollback Plan

## If Issues Occur

### Quick Rollback (5 minutes)
```yaml
1. Update DNS back to Amplify
   - CloudFront Distribution: dxxxxx.cloudfront.net
   - TTL 300 = 5 minute propagation

2. Keep both running for safety
   - Monitor error rates
   - Compare performance
```

### Gradual Migration
```yaml
1. Use Route53 weighted routing
   - 90% to Amplify
   - 10% to EC2
   
2. Gradually increase EC2 traffic
   - Monitor metrics
   - Adjust weights
```

### Data Sync Strategy
```bash
# If need to sync back to Supabase
pg_dump -h [RDS] -U postgres -d aiedulog > backup.sql
psql -h [SUPABASE] -U postgres -d postgres < backup.sql
```

---

# 📚 Part 9: Resources & Links

## AWS Dashboards
- **Main Console**: https://ap-northeast-2.console.aws.amazon.com/
- **EC2**: https://ap-northeast-2.console.aws.amazon.com/ec2/
- **RDS**: https://ap-northeast-2.console.aws.amazon.com/rds/
- **CloudWatch**: https://ap-northeast-2.console.aws.amazon.com/cloudwatch/

## Your Resources
- **GitHub**: [YOUR-GITHUB-REPO]
- **EC2 Instance**: [YOUR-INSTANCE-ID]
- **VPC**: [YOUR-VPC-ID]
- **Account**: [YOUR-AWS-ACCOUNT]

## Useful Commands Reference
```bash
# SSH to EC2
ssh -i ~/.ssh/aws/[YOUR-KEY-NAME].pem ubuntu@[IP]

# Connect to RDS
psql -h [RDS-ENDPOINT] -U postgres -d aiedulog

# PM2 commands
pm2 status / logs / restart / monit

# Nginx commands
sudo nginx -t
sudo systemctl reload nginx

# Redis commands
redis-cli ping
redis-cli monitor
```

---

# ✅ Part 10: Final Checklist

## Pre-Migration
- [ ] Backup Supabase data
- [ ] Test RDS connection
- [ ] Review this entire guide

## Migration Day 1-2
- [ ] EC2 software installed
- [ ] RDS instance created
- [ ] Data migrated successfully
- [ ] Indexes created

## Migration Day 3-4
- [ ] Application deployed
- [ ] PM2 running
- [ ] Nginx configured
- [ ] SSL certificate obtained

## Go-Live Day 5
- [ ] DNS updated
- [ ] Monitoring active
- [ ] Backups scheduled
- [ ] Performance verified

## Post-Migration
- [ ] Monitor for 48 hours
- [ ] Document any custom changes
- [ ] Celebrate! 🎉

---

*This is your complete, unified migration guide combining all documentation.*
*Estimated migration time: 5 days*
*Expected performance improvement: 10-20x*
*Support available at: GitHub Issues*

**Last Updated**: 2025-08-28