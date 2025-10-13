# ⚡ AWS Lightsail 마이그레이션 가이드

## 🎯 개요
**목표**: A계정 Amplify + Supabase → B계정 Lightsail + Lightsail Database  
**전략**: 빠르고 간단한 마이그레이션 (1일 완료)  
**비용**: $41/월 → $36/월 (절약!)

---

## 🚀 **왜 Lightsail인가?**

### ✅ **장점**
- **⚡ 초고속 설정**: 5분이면 인프라 완성
- **💰 비용 절약**: 기존보다 저렴
- **🛠️ 관리 간편**: 복잡한 설정 불필요
- **📈 확장 가능**: 나중에 EC2로 업그레이드 가능

### 📊 **비용 비교**
| 서비스 | 현재 (A계정) | Lightsail (B계정) | EC2 방식 |
|--------|-------------|------------------|----------|
| 호스팅 | Amplify $15 | Lightsail $20 | EC2 $60 |
| DB | Supabase $25 | Lightsail DB $15 | RDS $15 |
| 기타 | Route53 $1 | Route53 $1 | ALB+기타 $31 |
| **총합** | **$41/월** | **$36/월** ✅ | **$106/월** |

---

## 📅 **1일 마이그레이션 타임라인**

### 🌅 **오전 (09:00-12:00): 인프라 구축**
- [x] **09:00-09:30**: B계정 준비 및 Lightsail 서비스 활성화
- [x] **09:30-10:00**: Lightsail 인스턴스 생성
- [x] **10:00-10:30**: Lightsail 데이터베이스 생성  
- [x] **10:30-11:00**: 보안 그룹 및 방화벽 설정
- [x] **11:00-12:00**: SSL 인증서 및 정적 IP 할당

### 🌞 **점심 (13:00-14:00): 데이터 마이그레이션**
- [x] **13:00-13:30**: Supabase 데이터 백업
- [x] **13:30-14:00**: Lightsail DB로 데이터 복원

### 🌇 **오후 (14:00-18:00): 애플리케이션 배포**
- [x] **14:00-15:00**: 애플리케이션 코드 수정 (환경변수)
- [x] **15:00-16:00**: Docker 이미지 빌드 및 배포
- [x] **16:00-17:00**: 기능 테스트 및 검증
- [x] **17:00-18:00**: DNS 전환 및 최종 확인

---

## 🏗️ **Step 1: Lightsail 인프라 구축**

### 1.1 Lightsail 인스턴스 생성

```bash
# AWS CLI로 Lightsail 인스턴스 생성
aws lightsail create-instances \
  --region ap-northeast-2 \
  --instance-names aiedulog-app \
  --availability-zone ap-northeast-2a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id medium_2_0 \
  --user-data "#!/bin/bash
apt update && apt upgrade -y
apt install -y docker.io nodejs npm git
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh"

# 정적 IP 할당
aws lightsail allocate-static-ip \
  --static-ip-name aiedulog-static-ip

aws lightsail attach-static-ip \
  --static-ip-name aiedulog-static-ip \
  --instance-name aiedulog-app
```

### 1.2 Lightsail 데이터베이스 생성

```bash
# PostgreSQL 데이터베이스 인스턴스 생성
aws lightsail create-relational-database \
  --region ap-northeast-2 \
  --relational-database-name aiedulog-db \
  --relational-database-blueprint-id postgres_15 \
  --relational-database-bundle-id micro_2_0 \
  --master-database-name aiedulog \
  --master-username postgres \
  --master-user-password "SecurePassword123!" \
  --backup-retention-enabled \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00"
```

### 1.3 방화벽 및 네트워킹 설정

```bash
# HTTP/HTTPS 포트 열기
aws lightsail put-instance-public-ports \
  --instance-name aiedulog-app \
  --port-infos fromPort=80,toPort=80,protocol=TCP,cidr=0.0.0.0/0 \
             fromPort=443,toPort=443,protocol=TCP,cidr=0.0.0.0/0 \
             fromPort=3000,toPort=3000,protocol=TCP,cidr=0.0.0.0/0 \
             fromPort=22,toPort=22,protocol=TCP,cidr=0.0.0.0/0

# 데이터베이스 보안 설정 (Lightsail 인스턴스에서만 접근)
aws lightsail update-relational-database \
  --relational-database-name aiedulog-db \
  --publicly-accessible false
```

### 1.4 SSL 인증서 요청

```bash
# Let's Encrypt 인증서 (인스턴스 내에서 실행)
sudo apt install -y certbot nginx
sudo certbot certonly --nginx -d aiedulog.com
```

---

## 💾 **Step 2: 데이터 마이그레이션**

### 2.1 Supabase 데이터 백업

```bash
# 환경변수 설정
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_DB_PASSWORD="your-db-password"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# 전체 데이터베이스 덤프
pg_dump "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_URL#https://}.supabase.co:5432/postgres" \
  --no-owner --no-privileges --clean --if-exists \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  > "supabase_backup_${BACKUP_DATE}.sql"

# 중요 테이블만 선별 백업 (옵션)
pg_dump "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_URL#https://}.supabase.co:5432/postgres" \
  --no-owner --no-privileges \
  --table=public.posts \
  --table=public.profiles \
  --table=public.identities \
  --table=public.comments \
  > "supabase_essential_${BACKUP_DATE}.sql"
```

### 2.2 Lightsail DB 복원

```bash
# Lightsail DB 연결 정보 확인
aws lightsail get-relational-database \
  --relational-database-name aiedulog-db \
  --query 'relationalDatabase.masterEndpoint.address' \
  --output text

# 데이터 복원
LIGHTSAIL_DB_ENDPOINT="ls-xxxxxxxxxxxxx.czrs8gzkuf09.ap-northeast-2.rds.amazonaws.com"
psql -h ${LIGHTSAIL_DB_ENDPOINT} -U postgres -d aiedulog < supabase_backup_${BACKUP_DATE}.sql

# 데이터 무결성 검증
psql -h ${LIGHTSAIL_DB_ENDPOINT} -U postgres -d aiedulog -c "
  SELECT 
    'posts' as table_name, COUNT(*) as row_count FROM posts
  UNION ALL
  SELECT 
    'profiles' as table_name, COUNT(*) as row_count FROM profiles
  UNION ALL  
  SELECT
    'identities' as table_name, COUNT(*) as row_count FROM identities;
"
```

---

## 🚀 **Step 3: 애플리케이션 배포**

### 3.1 환경변수 설정

**기존 (Supabase)**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**신규 (Lightsail + Cognito)**:
```bash
# 데이터베이스
APP_DATABASE_URL=postgresql://postgres:SecurePassword123!@ls-xxxxxxxxxxxxx.czrs8gzkuf09.ap-northeast-2.rds.amazonaws.com:5432/aiedulog

# AWS Cognito (선택사항 - 나중에 설정 가능)
COGNITO_REGION=ap-northeast-2
COGNITO_USER_POOL_ID=ap-northeast-2_xxxxxxxxx  
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# NextAuth
NEXTAUTH_URL=https://aiedulog.com
NEXTAUTH_SECRET=randomSecretKeyForProduction123456789

# 기타
NODE_ENV=production
PORT=3000
```

### 3.2 코드 수정

**`src/lib/database.ts`** (새 파일):
```typescript
import { query } from './services/db'

// Supabase 클라이언트를 PostgreSQL 직접 연결로 대체
export async function getPosts() {
  const result = await query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20')
  return result.rows
}

export async function getProfiles() {
  const result = await query('SELECT * FROM profiles')
  return result.rows
}
```

**`src/app/api/posts/route.ts`** (수정):
```typescript
// 기존: createClient() 사용
// 신규: query() 함수 사용
import { query } from '@/lib/services/db'

export async function GET() {
  try {
    const result = await query(`
      SELECT p.*, pr.nickname, pr.avatar_url 
      FROM posts p 
      LEFT JOIN profiles pr ON p.user_id = pr.id 
      ORDER BY p.created_at DESC 
      LIMIT 20
    `)
    
    return NextResponse.json({ posts: result.rows })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
```

### 3.3 Docker 배포

**Dockerfile** (이미 존재):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**배포 스크립트**:
```bash
# Lightsail 인스턴스에 SSH 접속
aws lightsail get-instance-access-details --instance-name aiedulog-app

# 또는 직접 SSH (키 다운로드 후)
ssh -i aiedulog-key.pem ubuntu@LIGHTSAIL_STATIC_IP

# 인스턴스 내에서 실행
git clone https://github.com/milkrevenant/aiedulog-website.git
cd aiedulog-website/aiedulog

# 환경변수 파일 생성
cat > .env.production <<EOF
APP_DATABASE_URL=postgresql://postgres:SecurePassword123!@ls-xxxxxxxxxxxxx.czrs8gzkuf09.ap-northeast-2.rds.amazonaws.com:5432/aiedulog
NEXTAUTH_URL=https://aiedulog.com
NEXTAUTH_SECRET=randomSecretKeyForProduction123456789
NODE_ENV=production
PORT=3000
EOF

# Docker 빌드 및 실행
sudo docker build -t aiedulog:latest .
sudo docker run -d \
  --name aiedulog-app \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  aiedulog:latest

# Nginx 리버스 프록시 설정
sudo tee /etc/nginx/sites-available/aiedulog <<EOF
server {
    listen 80;
    server_name aiedulog.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aiedulog.com;
    
    ssl_certificate /etc/letsencrypt/live/aiedulog.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aiedulog.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/aiedulog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🌐 **Step 4: DNS 전환**

### 4.1 정적 IP 확인

```bash
# Lightsail 정적 IP 주소 확인
aws lightsail get-static-ip --static-ip-name aiedulog-static-ip \
  --query 'staticIp.ipAddress' --output text
```

### 4.2 Route 53 DNS 레코드 업데이트

```bash
# 현재 DNS 레코드 확인
aws route53 list-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --query "ResourceRecordSets[?Name=='aiedulog.com.']"

# A 레코드를 Lightsail IP로 변경
LIGHTSAIL_IP=$(aws lightsail get-static-ip --static-ip-name aiedulog-static-ip --query 'staticIp.ipAddress' --output text)

aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"aiedulog.com\",
        \"Type\": \"A\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"${LIGHTSAIL_IP}\"}]
      }
    }]
  }"

# www 서브도메인도 추가 (선택사항)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\", 
      \"ResourceRecordSet\": {
        \"Name\": \"www.aiedulog.com\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"aiedulog.com\"}]
      }
    }]
  }"
```

### 4.3 DNS 전파 확인

```bash
# DNS 전파 상태 확인
dig aiedulog.com +short
nslookup aiedulog.com

# 웹사이트 접속 테스트
curl -I https://aiedulog.com
```

---

## 🔍 **Step 5: 테스트 및 검증**

### 5.1 기능 테스트 체크리스트

- [ ] **홈페이지 로딩**: https://aiedulog.com 접속
- [ ] **게시글 목록**: 기존 포스트들이 정상 표시
- [ ] **게시글 작성**: 새 포스트 작성 가능
- [ ] **사용자 프로필**: 프로필 정보 표시
- [ ] **댓글 시스템**: 댓글 작성/표시
- [ ] **검색 기능**: 키워드 검색 동작
- [ ] **반응형 UI**: 모바일/데스크톱 정상 표시
- [ ] **SSL 인증서**: HTTPS 정상 동작

### 5.2 성능 테스트

```bash
# 응답 시간 측정
curl -o /dev/null -s -w "Total time: %{time_total}s\nDNS lookup: %{time_namelookup}s\nConnect: %{time_connect}s\nSSL: %{time_appconnect}s\n" https://aiedulog.com

# 동시 연결 테스트 (간단한 부하 테스트)
ab -n 1000 -c 10 https://aiedulog.com/
```

### 5.3 모니터링 설정

```bash
# Lightsail 메트릭 확인
aws lightsail get-instance-metric-data \
  --instance-name aiedulog-app \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# 데이터베이스 메트릭
aws lightsail get-relational-database-metric-data \
  --relational-database-name aiedulog-db \
  --metric-name DatabaseConnections \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

---

## 📈 **운영 및 유지보수**

### 6.1 자동 백업 설정

**데이터베이스 백업**:
```bash
# 일일 백업 스크립트 (crontab에 추가)
cat > /home/ubuntu/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d)
LIGHTSAIL_DB_ENDPOINT="ls-xxxxxxxxxxxxx.czrs8gzkuf09.ap-northeast-2.rds.amazonaws.com"

pg_dump -h ${LIGHTSAIL_DB_ENDPOINT} -U postgres aiedulog > /home/ubuntu/backups/aiedulog_${BACKUP_DATE}.sql
aws s3 cp /home/ubuntu/backups/aiedulog_${BACKUP_DATE}.sql s3://aiedulog-backups/

# 7일 이상 된 백업 삭제
find /home/ubuntu/backups -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh
echo "0 2 * * * /home/ubuntu/backup.sh" | crontab -
```

**인스턴스 스냅샷**:
```bash
# 주간 스냅샷 생성
aws lightsail create-instance-snapshot \
  --instance-name aiedulog-app \
  --instance-snapshot-name "aiedulog-weekly-$(date +%Y%m%d)"
```

### 6.2 모니터링 및 알람

**간단한 헬스체크 스크립트**:
```bash
cat > /home/ubuntu/healthcheck.sh <<'EOF'
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://aiedulog.com)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Website is UP (HTTP $RESPONSE)"
else
    echo "$(date): Website is DOWN (HTTP $RESPONSE)" 
    # 알림 발송 (예: Discord, Slack, 이메일)
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"🚨 AiEduLog 웹사이트 다운! HTTP '${RESPONSE}'"}' \
      YOUR_WEBHOOK_URL
fi
EOF

chmod +x /home/ubuntu/healthcheck.sh
echo "*/5 * * * * /home/ubuntu/healthcheck.sh >> /var/log/healthcheck.log" | crontab -
```

### 6.3 업데이트 및 배포

**자동 배포 스크립트**:
```bash
cat > /home/ubuntu/deploy.sh <<'EOF'
#!/bin/bash
cd /home/ubuntu/aiedulog-website/aiedulog

# 최신 코드 가져오기
git pull origin main

# 애플리케이션 다시 빌드
sudo docker build -t aiedulog:latest .

# 기존 컨테이너 중지 및 제거
sudo docker stop aiedulog-app || true
sudo docker rm aiedulog-app || true

# 새 컨테이너 실행
sudo docker run -d \
  --name aiedulog-app \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  aiedulog:latest

echo "Deployment completed: $(date)"
EOF

chmod +x /home/ubuntu/deploy.sh
```

---

## 🔄 **확장 경로 (향후)**

### Level 1: Lightsail → Lightsail Plus
```
- 더 큰 인스턴스 (Large: 4GB RAM, 2 vCPU)
- Load Balancer 추가
- CDN 설정
```

### Level 2: Lightsail → EC2
```
- Auto Scaling Group
- RDS Multi-AZ
- ElastiCache Redis
```

### Level 3: Multi-Region
```
- CloudFront Global CDN
- Route 53 Geo-routing
- Cross-region 복제
```

---

## 💰 **비용 최적화 팁**

### 1. 리소스 모니터링
```bash
# 월간 비용 확인
aws lightsail get-cost-estimate \
  --resource-type Instance \
  --start-time 2024-01-01 \
  --end-time 2024-01-31
```

### 2. 사용하지 않는 리소스 정리
```bash
# 오래된 스냅샷 삭제
aws lightsail get-instance-snapshots \
  --query "instanceSnapshots[?createdAt<'2024-01-01'].name" \
  --output text | xargs -I {} aws lightsail delete-instance-snapshot --instance-snapshot-name {}
```

### 3. 트래픽 기반 인스턴스 크기 조절
- **낮은 트래픽**: Micro ($10/월)
- **보통 트래픽**: Small ($20/월) ← **현재 권장**
- **높은 트래픽**: Medium ($40/월)

---

## 🚨 **문제 해결 가이드**

### 일반적인 문제들

#### 1. 데이터베이스 연결 실패
```bash
# 연결 테스트
telnet ls-xxxxxxxxxxxxx.czrs8gzkuf09.ap-northeast-2.rds.amazonaws.com 5432

# 방화벽 확인
aws lightsail get-relational-database \
  --relational-database-name aiedulog-db \
  --query 'relationalDatabase.publiclyAccessible'
```

#### 2. SSL 인증서 문제
```bash
# 인증서 갱신
sudo certbot renew --nginx

# 자동 갱신 설정
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

#### 3. 애플리케이션 크래시
```bash
# Docker 컨테이너 로그 확인
sudo docker logs aiedulog-app

# 컨테이너 재시작
sudo docker restart aiedulog-app
```

#### 4. DNS 전파 지연
```bash
# DNS 캐시 클리어 (로컬)
sudo systemctl restart systemd-resolved  # Ubuntu
sudo dscacheutil -flushcache  # macOS

# TTL 값을 낮게 설정 (60-300초)
```

---

## ✅ **마이그레이션 체크리스트**

### 준비 단계
- [ ] B계정 AWS 계정 활성화
- [ ] 결제 정보 등록 및 한도 설정
- [ ] IAM 사용자 생성 (Lightsail 권한)
- [ ] AWS CLI 설치 및 구성

### 인프라 구축
- [ ] Lightsail 인스턴스 생성 (Ubuntu 22.04, Medium)
- [ ] 정적 IP 할당 및 연결
- [ ] Lightsail 데이터베이스 생성 (PostgreSQL 15)
- [ ] 방화벽 규칙 설정 (80, 443, 3000, 22 포트)
- [ ] SSL 인증서 설치

### 데이터 마이그레이션
- [ ] Supabase 데이터 전체 백업
- [ ] 중요 테이블 개별 백업
- [ ] Lightsail DB로 데이터 복원
- [ ] 데이터 무결성 검증

### 애플리케이션 배포
- [ ] 환경변수 파일 생성 (`.env.production`)
- [ ] 코드 수정 (Supabase → PostgreSQL)
- [ ] Docker 이미지 빌드
- [ ] 컨테이너 실행 및 테스트
- [ ] Nginx 리버스 프록시 설정

### DNS 전환
- [ ] Lightsail 정적 IP 확인
- [ ] Route 53 A 레코드 업데이트
- [ ] www 서브도메인 설정 (선택)
- [ ] DNS 전파 확인

### 테스트 및 검증
- [ ] 웹사이트 기본 기능 테스트
- [ ] 데이터베이스 연결 확인
- [ ] SSL/HTTPS 동작 확인
- [ ] 모바일 반응형 확인
- [ ] 성능 테스트 (페이지 로드 속도)

### 운영 설정
- [ ] 자동 백업 스크립트 설정
- [ ] 헬스체크 모니터링 설정
- [ ] 로그 관리 시스템 구축
- [ ] 배포 자동화 스크립트 작성

### 정리 작업
- [ ] A계정 Amplify 앱 확인 (아직 삭제 금지)
- [ ] 사용자 공지사항 작성
- [ ] 문서 업데이트
- [ ] 팀 인수인계

---

## 🏁 **마이그레이션 완료 후**

### 성공 지표
- ✅ 웹사이트 정상 접속: https://aiedulog.com
- ✅ SSL 인증서 정상 동작
- ✅ 기존 데이터 모두 이전됨
- ✅ 새 게시글/댓글 작성 가능
- ✅ 페이지 로드 시간 < 3초
- ✅ 비용 절약: $5/월 감소

### 다음 단계
1. **1주일**: 안정성 모니터링
2. **2주일**: 성능 최적화
3. **1개월**: A계정 리소스 정리
4. **3개월**: 확장성 검토

---

**📝 작성일**: $(date +%Y-%m-%d)  
**👤 작성자**: Claude Code Assistant  
**🔄 버전**: v1.0  
**⚡ 특징**: 빠르고 간단한 Lightsail 마이그레이션