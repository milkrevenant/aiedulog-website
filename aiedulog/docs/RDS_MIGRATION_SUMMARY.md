# AWS RDS 마이그레이션 실행 가이드
**Supabase → AWS RDS PostgreSQL with Optimized RLS**

---

## 🎯 핵심 전략

**RLS는 제거하지 않고 최적화합니다**
- 65개 중복 정책 → 26개 통합 정책
- `auth.uid()` → Cognito JWT 기반 `get_current_user_id()` 함수
- 성능 70-90% 향상 + 보안 유지

**예상 소요 시간: 5-6일**

---

## Phase 1: RDS 설정 및 스키마 배포 (1-2일)

### Step 1.1: 환경 준비 (30분)

```bash
# 패키지 설치
cd aiedulog
npm install pg dotenv

# 환경변수 파일 생성
cat > .env.migration << 'EOF'
# Supabase (데이터 추출용)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# RDS 설정
RDS_HOST=aiedulog-db.xxxxx.ap-northeast-2.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=aiedulog
RDS_USERNAME=postgres
RDS_PASSWORD=your-secure-password
RDS_MAX_CONNECTIONS=20

# Cognito
COGNITO_USER_POOL_ID=ap-northeast-2_aMs5e49zf
COGNITO_CLIENT_ID=3jhf0l461l2dc5es7i2e5tparg
COGNITO_REGION=ap-northeast-2

# NextAuth
NEXTAUTH_URL=https://aiedulog.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF
```

### Step 1.2: RDS 인스턴스 생성 (45분)

```bash
# RDS 생성
aws rds create-db-instance \
  --db-instance-identifier aiedulog-production \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --db-name aiedulog \
  --master-username postgres \
  --master-user-password "YourSecurePassword123!" \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --deletion-protection

# 생성 완료 대기 (10-15분)
aws rds wait db-instance-available --db-instance-identifier aiedulog-production

# 엔드포인트 확인
aws rds describe-db-instances \
  --db-instance-identifier aiedulog-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# 연결 테스트
psql -h aiedulog-db.xxxxx.ap-northeast-2.rds.amazonaws.com \
     -U postgres -d aiedulog -c "SELECT version();"
```

### Step 1.3: 마이그레이션 파일 생성 및 배포 (2-3시간)

```bash
# 폴더 생성
mkdir -p aiedulog/migrations

# 6개 SQL 파일 생성 (전체 내용은 AWS_RDS_MIGRATION_COMPLETE_PLAN.txt 참고)
# 001_jwt_extraction_function.sql     - get_current_user_id() 함수
# 002_core_tables.sql                 - 12개 테이블 생성
# 003_permission_cache.sql            - 권한 캐시 materialized view
# 004_enable_rls.sql                  - 모든 테이블 RLS 활성화
# 005_unified_rls_policies.sql        - 26개 통합 정책
# 006_rls_performance_indexes.sql     - 성능 인덱스

# 순차 실행
psql -h $RDS_HOST -U postgres -d aiedulog -f migrations/001_jwt_extraction_function.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migrations/002_core_tables.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migrations/003_permission_cache.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migrations/004_enable_rls.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migrations/005_unified_rls_policies.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migrations/006_rls_performance_indexes.sql

# 검증
psql -h $RDS_HOST -U postgres -d aiedulog -c "\dt"
psql -h $RDS_HOST -U postgres -d aiedulog -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';"
```

**핵심 기능:**

1. **JWT 추출 함수**
```sql
CREATE FUNCTION get_current_user_id() RETURNS UUID AS $$
DECLARE
  jwt_claims jsonb;
  cognito_sub text;
BEGIN
  jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
  cognito_sub := jwt_claims->>'sub';

  SELECT user_id INTO found_user_id
  FROM auth_methods
  WHERE provider = 'cognito' AND auth_provider_id = cognito_sub;

  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

2. **통합 RLS 정책 예시**
```sql
-- 65개 중복 정책을 CASE 문으로 통합
CREATE POLICY "unified_posts_select" ON posts FOR SELECT USING (
  CASE
    WHEN is_published = true THEN true
    WHEN author_id = get_current_user_id() THEN true
    WHEN is_user_moderator(get_current_user_id()) THEN true
    ELSE false
  END
);
```

---

## Phase 2: 애플리케이션 통합 (1일)

### 생성 파일 목록

1. **src/lib/db/rds-client.ts** - RDS 연결 클라이언트
2. **src/middleware.ts** - JWT 추출 및 헤더 주입 (업데이트)
3. **src/app/api/*/route.ts** - 모든 API 라우트 업데이트

### 핵심 코드

**rds-client.ts**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.RDS_HOST!,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE!,
  user: process.env.RDS_USERNAME!,
  password: process.env.RDS_PASSWORD!,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
});

export async function queryWithAuth<T = any>(
  queryText: string,
  params: any[] = [],
  jwtClaims?: Record<string, any>
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    // JWT claims를 PostgreSQL 세션 변수로 설정
    if (jwtClaims) {
      await client.query('SET LOCAL request.jwt.claims = $1', [JSON.stringify(jwtClaims)]);
    }
    const result = await client.query(queryText, params);
    return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
  } finally {
    client.release();
  }
}
```

**middleware.ts 업데이트**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JWTAuthMiddleware } from '@/lib/auth/jwt-middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  try {
    const user = await JWTAuthMiddleware.verifyToken(request);
    if (user) {
      // JWT claims를 헤더로 전달
      const jwtClaims = {
        sub: user.cognitoSub,
        email: user.email,
        role: user.role,
        exp: user.expiresAt
      };
      response.headers.set('x-jwt-claims', JSON.stringify(jwtClaims));
    }
  } catch (error) {
    console.error('Middleware JWT verification error:', error);
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/:path*']
};
```

**API 라우트 예시 (posts)**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { queryWithAuth } from '@/lib/db/rds-client';

export const GET = async (req: NextRequest) => {
  const jwtClaimsHeader = req.headers.get('x-jwt-claims');
  const jwtClaims = jwtClaimsHeader ? JSON.parse(jwtClaimsHeader) : null;

  // RLS 정책이 자동 적용됨
  const { rows: posts } = await queryWithAuth(
    `SELECT p.*, u.username as author_username
     FROM posts p
     LEFT JOIN user_profiles u ON p.author_id = u.user_id
     ORDER BY p.created_at DESC LIMIT 20`,
    [],
    jwtClaims
  );

  return NextResponse.json({ posts });
};
```

**변경 필요한 파일 목록 (141개 파일)**
- Supabase client 사용하는 모든 파일
- `createClient()` → `queryWithAuth()` 변경
- API 라우트 전체 업데이트 필요

---

## Phase 3: 데이터 마이그레이션 (1일)

### 데이터 추출 및 변환

```bash
# 1. Supabase에서 데이터 추출 (이미 준비된 스크립트)
node scripts/extract-production-data.js --dry-run  # 테스트
node scripts/extract-production-data.js            # 실제 추출

# 2. RDS에 데이터 임포트 (우선순위 순서)
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/user_profiles_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/auth_methods_inserts.sql

# 권한 캐시 새로고침
psql -h $RDS_HOST -U postgres -d aiedulog -c "SELECT refresh_user_permission_cache();"

# 나머지 데이터
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/posts_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/comments_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/post_likes_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/bookmarks_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/chat_rooms_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/chat_participants_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/chat_messages_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/lectures_inserts.sql
psql -h $RDS_HOST -U postgres -d aiedulog -f migration-data/lecture_registrations_inserts.sql

# 3. 검증
node scripts/validate-migration.js
cat migration-data/validation_report.json
```

**주의사항:**
- Supabase `auth.users.id` → RDS `user_profiles.user_id` 매핑 필요
- `auth_methods` 테이블에 Cognito 연결 정보 저장
- 외래 키 순서 중요 (user_profiles → posts → comments)

---

## Phase 4: 배포 준비 (1일)

### 환경변수 및 시크릿 관리

```bash
# 1. .env.production 생성
cat > .env.production << 'EOF'
RDS_HOST=aiedulog-db.xxxxx.ap-northeast-2.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=aiedulog
RDS_USERNAME=postgres
RDS_PASSWORD=stored-in-aws-ssm
COGNITO_USER_POOL_ID=ap-northeast-2_aMs5e49zf
COGNITO_CLIENT_ID=3jhf0l461l2dc5es7i2e5tparg
COGNITO_REGION=ap-northeast-2
NEXTAUTH_URL=https://aiedulog.com
NEXTAUTH_SECRET=your-secret-here
EOF

# 2. AWS SSM에 시크릿 저장
aws ssm put-parameter \
  --name "/aiedulog/rds/password" \
  --value "YourSecurePassword123!" \
  --type "SecureString" \
  --region ap-northeast-2

aws ssm put-parameter \
  --name "/aiedulog/nextauth/secret" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString" \
  --region ap-northeast-2

# 3. 빌드 테스트
npm run type-check
npm run build

# 4. 로컬 테스트
npm run dev
```

---

## Phase 5: 프로덕션 배포 (1-2일)

### Step 5.1: 스테이징 배포

```bash
# EC2 접속
ssh -i your-key.pem ec2-user@staging-ec2

# 배포
cd /var/www/aiedulog/aiedulog
git pull origin main
npm install
npm run build
pm2 restart aiedulog-staging

# 테스트
curl https://staging.aiedulog.com/api/health
```

### Step 5.2: 프로덕션 배포

```bash
# EC2 접속
ssh -i your-key.pem ec2-user@production-ec2

# 배포
cd /var/www/aiedulog/aiedulog
git pull origin main
npm install
npm run build
pm2 restart aiedulog-production
```

### Step 5.3: DNS 점진적 전환 (Blue-Green)

**10% 트래픽 → RDS (1시간 모니터링)**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "aiedulog.com",
        "Type": "A",
        "SetIdentifier": "rds-new",
        "Weight": 10,
        "AliasTarget": {
          "DNSName": "aiedulog-alb-new.ap-northeast-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true,
          "HostedZoneId": "ZWKZPGTI48KDX"
        }
      }
    }]
  }'
```

**50% 트래픽 (4시간 모니터링)**
```bash
# Weight: 10 → 50으로 변경
aws route53 change-resource-record-sets ... (Weight: 50)
```

**100% 트래픽 (24시간 모니터링)**
```bash
# Weight: 50 → 100으로 변경
aws route53 change-resource-record-sets ... (Weight: 100)
```

### Step 5.4: 모니터링 지표 (24시간)

- ✅ RDS CPU < 70%
- ✅ 응답시간 < 200ms (70%+ 향상 목표)
- ✅ 에러율 < 0.5%
- ✅ 연결 수 < 15/20
- ✅ RLS 정책 정상 작동

---

## 🚨 롤백 절차

### 긴급 롤백 (DNS)

```bash
# RDS 트래픽 즉시 제거
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "aiedulog.com",
        "Type": "A",
        "SetIdentifier": "rds-new"
      }
    }]
  }'

# 데이터 백업 (필요 시)
pg_dump -h $RDS_HOST -U postgres aiedulog > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## ✅ 성공 기준

### 기술
- ✅ 데이터 무손실 (100% 일치)
- ✅ 응답시간 < 200ms
- ✅ RDS CPU < 70%
- ✅ RLS 정책 26개 적용
- ✅ 쿼리 성능 70%+ 향상

### 보안
- ✅ 모든 테이블 RLS 활성화
- ✅ JWT 추출 정상 작동
- ✅ 권한 캐시 실시간 갱신
- ✅ SQL injection 차단

### 컴플라이언스
- ✅ GDPR 준수
- ✅ SOC2 감사 로그
- ✅ 암호화 (전송+저장)
- ✅ 7일 백업 유지

---

## 📋 체크리스트

### Phase 1
- [ ] RDS 인스턴스 생성
- [ ] migrations/ 폴더 및 6개 SQL 파일 생성
- [ ] 마이그레이션 실행
- [ ] 테이블 및 RLS 정책 검증

### Phase 2
- [ ] src/lib/db/rds-client.ts 생성
- [ ] src/middleware.ts 업데이트
- [ ] 141개 API 라우트 파일 업데이트
- [ ] Supabase client 제거

### Phase 3
- [ ] Supabase 데이터 추출
- [ ] auth_methods 매핑 생성
- [ ] RDS 데이터 임포트
- [ ] 검증 스크립트 실행

### Phase 4
- [ ] .env.production 생성
- [ ] AWS SSM 시크릿 저장
- [ ] 빌드 테스트 통과
- [ ] 로컬 RDS 연결 테스트

### Phase 5
- [ ] 스테이징 배포
- [ ] 스테이징 테스트 통과
- [ ] 프로덕션 배포
- [ ] DNS 10% → 50% → 100% 전환
- [ ] 24시간 모니터링 완료

---

**작성일:** 2025-10-13
**버전:** 1.0
**상태:** 실행 준비 완료
**전체 계획:** [AWS_RDS_MIGRATION_COMPLETE_PLAN.txt](./AWS_RDS_MIGRATION_COMPLETE_PLAN.txt)
