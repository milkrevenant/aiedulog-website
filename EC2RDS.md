# 🚀 AWS EC2 + RDS PostgreSQL 마이그레이션 가이드

## 📅 생성일: 2025-08-26
## 👤 계정: stillalice_njgs (5167-2554-2518)
## 🌏 리전: 아시아 태평양 (서울) ap-northeast-2

---

## 🖥️ EC2 인스턴스 정보

### 인스턴스 상세
- **인스턴스 ID**: `i-02b0aedc6bf6c0bda`
- **AMI**: Ubuntu Server 22.04 LTS
- **인스턴스 유형**: t3.micro (프리티어)
- **VPC ID**: `vpc-0adcf98e775aaf9ee`
- **스토리지**: 30GB gp3 SSD
- **키 페어**: `aiedulog_instance.pem`

### 보안 그룹 설정
| 유형 | 프로토콜 | 포트 | 소스 | 설명 |
|------|----------|------|------|------|
| SSH | TCP | 22 | 내 IP | Admin SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |
| Custom TCP | TCP | 3000 | 내 IP | Node.js dev (임시) |

---

## 🗄️ RDS PostgreSQL 설정

### 데이터베이스 정보
- **엔진**: PostgreSQL 15.4
- **템플릿**: 프리티어
- **인스턴스 클래스**: db.t3.micro
- **식별자**: `aiedulog-database`
- **마스터 사용자**: `postgres`
- **초기 DB 이름**: `aiedulog`
- **스토리지**: 20GB gp2
- **백업**: 7일 자동 백업
- **암호화**: 활성화

### 연결 설정
- **EC2 연결**: i-02b0aedc6bf6c0bda
- **퍼블릭 액세스**: 아니요
- **포트**: 5432
- **VPC**: vpc-0adcf98e775aaf9ee (기본값)

---

## 🛠️ EC2 초기 설정 스크립트

```bash
#!/bin/bash
# SSH 접속
ssh -i ~/.ssh/aws/aiedulog_instance.pem ubuntu@[EC2-퍼블릭-IP]

# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Nginx 설치
sudo apt install -y nginx

# 4. PM2 설치
sudo npm install -g pm2

# 5. Git 설치
sudo apt install -y git

# 6. Redis 설치 (로컬 캐싱)
sudo apt install -y redis-server
sudo systemctl enable redis-server

# 7. PostgreSQL 클라이언트
sudo apt install -y postgresql-client
```

---

## 📦 앱 배포 스크립트

```bash
# 1. 프로젝트 클론
cd /home/ubuntu
git clone https://github.com/milkrevenant/aiedulog-website.git
cd aiedulog-website/aiedulog

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cat > .env.production << EOF
DATABASE_URL=postgresql://postgres:[PASSWORD]@[RDS-엔드포인트]:5432/aiedulog
NEXT_PUBLIC_SUPABASE_URL=https://[프로젝트].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[키]
REDIS_URL=redis://localhost:6379
NODE_ENV=production
EOF

# 4. 빌드
npm run build

# 5. PM2로 실행
pm2 start npm --name "aiedulog" -- start
pm2 save
pm2 startup
```

---

## ⚙️ Nginx 설정

```nginx
# /etc/nginx/sites-available/aiedulog
server {
    listen 80;
    server_name aiedulog.com www.aiedulog.com;

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
    }

    location /_next/static {
        proxy_cache STATIC;
        proxy_pass http://localhost:3000;
        add_header X-Cache-Status $upstream_cache_status;
    }
}

# 활성화
sudo ln -s /etc/nginx/sites-available/aiedulog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 데이터베이스 마이그레이션

```bash
# 1. Supabase에서 데이터 내보내기
pg_dump --host=db.xxxxx.supabase.co \
        --username=postgres \
        --dbname=postgres \
        --schema=public \
        --no-owner \
        --no-privileges \
        > backup.sql

# 2. RDS로 가져오기
psql --host=[RDS-엔드포인트] \
     --username=postgres \
     --dbname=aiedulog \
     < backup.sql
```

---

## 🔐 SSL 인증서 설정

```bash
# Let's Encrypt 무료 SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aiedulog.com -d www.aiedulog.com
```

---

## 🚀 Redis 캐싱 구현

```javascript
// lib/cache.js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});

export async function getCached(key, fetcher, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// 사용 예시
const stats = await getCached('stats:dashboard', fetchStats, 3600);
```

---

## 📊 RLS 성능 최적화

```sql
-- 필수 인덱스 생성
CREATE INDEX idx_posts_user_published ON posts(poster_id, is_published);
CREATE INDEX idx_profiles_role ON profiles(role) WHERE role != 'member';
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- 권한 캐시 테이블
CREATE MATERIALIZED VIEW user_permission_cache AS
SELECT 
  user_id,
  bool_or(role = 'admin') as is_admin,
  bool_or(role = 'moderator') as is_moderator,
  array_agg(DISTINCT role) as roles
FROM profiles
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_permission_cache(user_id);
```

---

## 💰 예상 월 비용

| 서비스 | 사양 | 프리티어 | 이후 비용 |
|--------|------|----------|-----------|
| EC2 | t3.micro | 750시간 무료 | $8.5/월 |
| RDS | db.t3.micro | 750시간 무료 | $15/월 |
| EBS | 30GB | 30GB 무료 | $3/월 |
| 데이터 전송 | 100GB | 15GB 무료 | $9/월 |
| **총합** | | **$0** | **약 $35.5/월** |

---

## 📝 체크리스트

### EC2 설정
- [x] EC2 인스턴스 생성 (t3.micro)
- [x] 보안 그룹 설정
- [x] 키 페어 생성 및 저장
- [ ] Elastic IP 할당
- [ ] EC2 소프트웨어 설치

### RDS 설정
- [ ] RDS PostgreSQL 생성
- [ ] EC2와 연결 설정
- [ ] 보안 그룹 자동 구성
- [ ] 엔드포인트 확인

### 애플리케이션 배포
- [ ] 코드 배포
- [ ] 환경변수 설정
- [ ] PM2 설정
- [ ] Nginx 리버스 프록시 설정

### 데이터 마이그레이션
- [ ] Supabase 백업
- [ ] RDS로 복원
- [ ] 연결 테스트

### 최종 설정
- [ ], 도메인 연결
- [ ] SSL 인증서 설치
- [ ] Redis 캐싱 구현
- [ ] 모니터링 설정

---

## 🔗 유용한 링크

- [AWS Console](https://ap-northeast-2.console.aws.amazon.com/)
- [EC2 대시보드](https://ap-northeast-2.console.aws.amazon.com/ec2/)
- [RDS 대시보드](https://ap-northeast-2.console.aws.amazon.com/rds/)
- [GitHub Repository](https://github.com/milkrevenant/aiedulog-website)

---

## 📞 문제 해결

### EC2 접속 안될 때
```bash
# 권한 확인
chmod 400 ~/.ssh/aws/aiedulog_instance.pem

# 보안 그룹 확인 (SSH 포트 22가 내 IP에 열려있는지)
```

### RDS 연결 안될 때
```bash
# EC2에서 RDS 연결 테스트
psql --host=[RDS-엔드포인트] --username=postgres --dbname=aiedulog

# 보안 그룹 확인 (5432 포트)
```

### PM2 앱 상태 확인
```bash
pm2 status
pm2 logs aiedulog
pm2 restart aiedulog
```

---

*마지막 업데이트: 2025-08-26*

---

## ✅ Cognito + NextAuth + RDS/ECR/EC2 마이그레이션 플랜 (2025-09)

아래 순서대로 진행하면 됩니다. 콘솔에서 해야 하는 것과 명령으로 처리할 것을 분리했습니다.

### 0) 결과물/엔드포인트
- 헬스체크: `GET /api/health` → 200 OK
- 로그인: Cognito Hosted UI → NextAuth 세션 쿠키(`next-auth.session-token`)
- 보호 라우트: `middleware.ts`가 NextAuth 세션으로 접근 제어
- Docker 이미지: Next.js 15 standalone, ECR에 `aiedulog:prod`

### 1) 콘솔에서 해야 하는 것 (당신)
1. Cognito User Pool 생성
   - App client(Web, no secret) 생성
   - Hosted UI 도메인 prefix 설정(예: `aiedulog-prod`)
   - OAuth → Authorization code grant, Scopes: `openid email profile`
   - Callback URL: `https://YOUR_APP_DOMAIN/api/auth/callback/cognito`
   - Sign-out URL: `https://YOUR_APP_DOMAIN/api/auth/signout`
   - 값 메모: `COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_DOMAIN`

2. RDS PostgreSQL 15 생성 (EC2와 같은 VPC/서브넷)
   - 보안그룹: 인바운드 5432 → EC2 SG만 허용
   - 엔드포인트 메모: `RDS-ENDPOINT:5432`

3. (선택) ECR 리포지토리 생성 (이름: `aiedulog`)

4. EC2 인스턴스 준비 (Docker 설치 예정)
   - 동일 VPC/서브넷, ALB 뒤 배치 가능
   - 보안그룹: 아웃바운드 허용, 인바운드(테스트용 3000 또는 ALB 통해 80/443)

### 2) SSM 파라미터 저장 (내가 명령 제공, 당신 값만 필요)
필요한 값: `AWS_REGION, SSM_PREFIX(/aiedulog/prod), NEXTAUTH_URL, NEXTAUTH_SECRET(랜덤 32+), COGNITO_*, APP_DATABASE_URL`

```bash
export AWS_REGION=ap-northeast-2
export SSM_PREFIX=/aiedulog/prod

export NEXTAUTH_URL=https://YOUR_APP_DOMAIN
export NEXTAUTH_SECRET='GENERATE_A_STRONG_SECRET'

export COGNITO_REGION=ap-northeast-2
export COGNITO_USER_POOL_ID=ap-northeast-2_xxxxx
export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
export COGNITO_DOMAIN=yourprefix

# RDS URL: postgres://USER:PASS@RDS-ENDPOINT:5432/DB
export APP_DATABASE_URL='postgres://USER:PASS@RDS-ENDPOINT:5432/DB'

aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/COGNITO_REGION" --value "$COGNITO_REGION" --type String --overwrite
aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/COGNITO_USER_POOL_ID" --value "$COGNITO_USER_POOL_ID" --type String --overwrite
aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/COGNITO_CLIENT_ID" --value "$COGNITO_CLIENT_ID" --type String --overwrite
aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/COGNITO_DOMAIN" --value "$COGNITO_DOMAIN" --type String --overwrite
aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/NEXTAUTH_URL" --value "$NEXTAUTH_URL" --type String --overwrite
aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/NEXTAUTH_SECRET" --value "$NEXTAUTH_SECRET" --type SecureString --overwrite
aws ssm put-parameter --region "$AWS_REGION" --name "$SSM_PREFIX/APP_DATABASE_URL" --value "$APP_DATABASE_URL" --type SecureString --overwrite
```

### 3) RDS 스키마 적용 (로컬에서 실행)
덤프/변환본은 이미 준비됨:
- `aiedulog/aiedulog/supabase-schema.sql`
- `aiedulog/aiedulog/rds-schema.transformed.sql`

```bash
export APP_DATABASE_URL='postgres://USER:PASS@RDS-ENDPOINT:5432/DB'
psql "$APP_DATABASE_URL" -v ON_ERROR_STOP=1 -f aiedulog/aiedulog/rds-schema.transformed.sql

# 간단 확인
psql "$APP_DATABASE_URL" -c "select now();"
```

### 4) Docker 이미지 빌드/푸시 (ECR)
```bash
export AWS_REGION=ap-northeast-2
export AWS_ACCOUNT_ID=123456789012
export TAG=prod

bash aiedulog/aiedulog/scripts/aws/ecr-build-push.sh
# 결과: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aiedulog:$TAG
```

### 5) EC2에서 컨테이너 실행
```bash
export AWS_REGION=ap-northeast-2
export SSM_PREFIX=/aiedulog/prod
export ECR_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aiedulog:prod

# EC2에서 실행 (SSH 접속 후)
bash aiedulog/aiedulog/scripts/aws/ec2-run.sh
```

### 6) 검증
- 헬스체크: `https://YOUR_APP_DOMAIN/api/health` → 200 OK
- 로그인: `https://YOUR_APP_DOMAIN/api/auth/signin` → Cognito Hosted UI → `/dashboard`
- 보호 경로(관리자/운영진) 접근 제어 확인

### 7) 트러블슈팅 요약
- 쿠키/세션: `next-auth.session-token` 존재 확인
- CSP: `next.config.ts`에 Cognito 도메인 반영(커넥트/프레임)
- 네트워크: EC2→RDS 5432 인바운드 허용, ALB HealthCheck `/api/health`
- 로그: `docker logs -f aiedulog` 또는 CloudWatch

### 8) 관련 파일(본 리포지토리)
- `aiedulog/aiedulog/src/app/api/auth/[...nextauth]/route.ts` (Cognito)
- `aiedulog/aiedulog/src/app/providers.tsx` (SessionProvider)
- `aiedulog/aiedulog/src/components/AuthGuard.tsx` (권한)
- `aiedulog/aiedulog/src/middleware.ts` (세션 검사/제외 경로)
- `aiedulog/aiedulog/next.config.ts` (CSP/standalone)
- `aiedulog/aiedulog/src/lib/services/db.ts` (RDS 연결)
- `aiedulog/aiedulog/src/app/api/health/route.ts` (헬스)
- `aiedulog/aiedulog/supabase-schema.sql`, `aiedulog/aiedulog/rds-schema.transformed.sql`
- `aiedulog/aiedulog/scripts/aws/ecr-build-push.sh`, `aiedulog/aiedulog/scripts/aws/ec2-run.sh`

---

최소 입력값을 제공해 주시면 위 명령들을 순차 실행하고, 검증 완료 시점에 변경사항을 일괄 커밋/푸시합니다.