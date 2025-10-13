# 🚀 AiEduLog RDS 마이그레이션 실행 가이드

Supabase에서 AWS RDS로 안전하고 체계적으로 마이그레이션하는 완벽한 가이드입니다.

## 📋 마이그레이션 개요

### 현재 상황
- **데이터베이스**: Supabase PostgreSQL (82개 테이블, 215개 RLS 정책)
- **인증**: Supabase Auth
- **호스팅**: AWS Amplify

### 목표 아키텍처  
- **데이터베이스**: AWS RDS PostgreSQL (26개 핵심 테이블, RLS 없음)
- **인증**: AWS Cognito + NextAuth.js + JWT
- **호스팅**: AWS EC2 + Application Load Balancer

## 🎯 마이그레이션 전략

### Phase 1: 준비 (1-2일)
- RDS 인스턴스 생성 및 설정
- 스키마 배포 및 검증
- 데이터 추출 및 변환

### Phase 2: 보안 시스템 구축 (2-3일)  
- JWT 인증 시스템 배포
- 권한 관리 서비스 적용
- 애플리케이션 레벨 보안 구현

### Phase 3: 데이터 마이그레이션 (1일)
- 우선순위별 데이터 이전
- 데이터 무결성 검증
- 기능 테스트

### Phase 4: 전환 (1일)
- DNS 전환
- 모니터링 및 롤백 준비

---

## 🔧 단계별 실행 가이드

### Step 1: 환경 준비

#### 1.1 필요한 도구 설치
```bash
# Node.js 패키지 설치
npm install @supabase/supabase-js aws-jwt-verify jsonwebtoken pg dotenv

# AWS CLI 설정 (필요시)
aws configure
```

#### 1.2 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env

# 필요한 환경 변수들
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

RDS_HOST=your-rds-endpoint.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=aiedulog
RDS_USERNAME=postgres
RDS_PASSWORD=your-secure-password

COGNITO_USER_POOL_ID=ap-northeast-2_xxxxxxxxx
COGNITO_CLIENT_ID=your-client-id
COGNITO_REGION=ap-northeast-2

NEXTAUTH_SECRET=your-nextauth-secret
JWT_ISSUER=aiedulog
JWT_AUDIENCE=aiedulog-web
```

### Step 2: RDS 인스턴스 생성

#### 2.1 AWS RDS PostgreSQL 생성
```bash
# AWS CLI를 사용한 RDS 생성
aws rds create-db-instance \
  --db-instance-identifier aiedulog-production \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name aiedulog \
  --master-username postgres \
  --master-user-password "YourSecurePassword123!" \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --storage-encrypted \
  --deletion-protection

# 생성 완료까지 대기 (약 10-15분)
aws rds wait db-instance-available --db-instance-identifier aiedulog-production
```

#### 2.2 데이터베이스 스키마 적용
```bash
# RDS 연결 테스트
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -c "SELECT version();"

# DDL 스키마 적용
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f docs/RDS_MIGRATION_DDL.sql

# 테이블 생성 확인
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### Step 3: 데이터 추출 및 마이그레이션

#### 3.1 Supabase에서 데이터 추출
```bash
# 데이터 추출 실행 (DRY RUN 먼저)
node scripts/extract-production-data.js --dry-run

# 실제 데이터 추출
node scripts/extract-production-data.js

# 추출 결과 확인
ls -la migration-data/
cat migration-data/MIGRATION_SUMMARY.md
```

#### 3.2 RDS로 데이터 임포트
```bash
# SQL 스크립트를 사용한 데이터 임포트 (우선순위 순서대로)

# HIGH Priority 테이블들 먼저
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/user_profiles_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/auth_methods_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/posts_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/comments_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/post_likes_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/bookmarks_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/notifications_inserts.sql

# MEDIUM Priority 테이블들
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/chat_rooms_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/chat_participants_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/chat_messages_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/lectures_inserts.sql
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -f migration-data/lecture_registrations_inserts.sql

# 기타 테이블들...
```

#### 3.3 데이터 무결성 검증
```bash
# 마이그레이션 검증 실행
node scripts/validate-migration.js

# 검증 결과 확인
cat migration-data/validation_report.json
```

### Step 4: 애플리케이션 코드 업데이트

#### 4.1 패키지 설치
```bash
# JWT 및 인증 관련 패키지
npm install jsonwebtoken aws-jwt-verify
npm install @types/jsonwebtoken --save-dev

# PostgreSQL 클라이언트 (Supabase 대체)
npm install pg @types/pg --save-dev

# 기존 Supabase 의존성은 점진적으로 제거 예정
```

#### 4.2 환경 설정 확인
```typescript
// next.config.js에 환경 변수 추가
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    RDS_HOST: process.env.RDS_HOST,
    RDS_DATABASE: process.env.RDS_DATABASE,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  },
};

module.exports = nextConfig;
```

#### 4.3 데이터베이스 연결 설정
```typescript
// lib/db/connection.ts (새로 생성)
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool as db };
```

### Step 5: 기능 테스트

#### 5.1 로컬 테스트
```bash
# 개발 서버 시작
npm run dev

# 기본 기능 테스트
# 1. 사용자 로그인/회원가입
# 2. 게시글 CRUD
# 3. 댓글 시스템
# 4. 채팅 기능
# 5. 강의 등록/조회
```

#### 5.2 API 엔드포인트 테스트
```bash
# JWT 토큰 발급 테스트
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 인증이 필요한 API 테스트
curl -X GET http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 권한이 필요한 관리자 API 테스트
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Step 6: 프로덕션 배포

#### 6.1 빌드 및 배포
```bash
# 프로덕션 빌드
npm run build

# 빌드 에러 확인 및 해결
npm run lint
npm run type-check

# EC2에 배포 (사용하는 배포 방식에 따라)
# 예: PM2 사용 시
pm2 start npm --name "aiedulog" -- start
pm2 save
pm2 startup
```

#### 6.2 환경 변수 설정 (프로덕션)
```bash
# AWS Systems Manager Parameter Store 사용 (권장)
aws ssm put-parameter --name "/aiedulog/db/url" --value "postgresql://..." --type "SecureString"
aws ssm put-parameter --name "/aiedulog/jwt/secret" --value "..." --type "SecureString"
aws ssm put-parameter --name "/aiedulog/cognito/client-id" --value "..." --type "SecureString"

# 또는 EC2 인스턴스의 .env 파일 직접 설정
sudo nano /var/www/aiedulog/.env
```

### Step 7: DNS 전환

#### 7.1 점진적 트래픽 전환 (Route 53)
```bash
# 1단계: 10% 트래픽을 RDS 환경으로
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "aiedulog.com",
      "Type": "A", 
      "SetIdentifier": "rds-new",
      "Weight": 10,
      "AliasTarget": {
        "DNSName": "aiedulog-alb-xxxxx.ap-northeast-2.elb.amazonaws.com",
        "EvaluateTargetHealth": true,
        "HostedZoneId": "ZWKZPGTI48KDX"
      }
    }
  }]
}'

# 2단계: 50% 트래픽 (1-2시간 후 이상 없으면)
# Weight를 50으로 변경

# 3단계: 100% 트래픽 (추가 1-2시간 후)
# Weight를 100으로 변경하고 기존 레코드 제거
```

#### 7.2 모니터링 설정
```bash
# CloudWatch 알람 설정
aws cloudwatch put-metric-alarm \
  --alarm-name "RDS-High-CPU" \
  --alarm-description "RDS CPU usage > 80%" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/RDS" \
  --statistic "Average" \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions "Name=DBInstanceIdentifier,Value=aiedulog-production"

# Application Load Balancer 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "ALB-High-Error-Rate" \
  --alarm-description "ALB 5XX errors > 5%" \
  --metric-name "HTTPCode_Target_5XX_Count" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 50 \
  --comparison-operator "GreaterThanThreshold"
```

---

## 🚨 롤백 계획

### 즉시 롤백 (DNS 변경)
```bash
# Route 53에서 모든 트래픽을 기존 Amplify로 되돌리기
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "aiedulog.com",
      "Type": "A",
      "AliasTarget": {
        "DNSName": "d12345abcdef.amplifyapp.com", 
        "EvaluateTargetHealth": false,
        "HostedZoneId": "Z2FDTNDATAQYW2"
      }
    }
  }]
}'
```

### 데이터 복구 (필요시)
```bash
# RDS에서 최신 데이터 백업
pg_dump -h aiedulog-production.cluster-xxxxx.ap-northeast-2.rds.amazonaws.com \
  -U postgres aiedulog > emergency_backup.sql

# Supabase로 데이터 복구
psql "postgresql://postgres:password@db.supabase.co:5432/postgres" \
  < emergency_backup.sql
```

---

## 📊 체크리스트

### 마이그레이션 준비
- [ ] AWS RDS PostgreSQL 인스턴스 생성
- [ ] 보안 그룹 및 네트워크 설정
- [ ] RDS 스키마 적용 및 검증
- [ ] AWS Cognito User Pool 설정  
- [ ] 환경 변수 모든 설정 완료
- [ ] 백업 정책 수립

### 데이터 마이그레이션
- [ ] Supabase 데이터 추출 완료
- [ ] RDS 데이터 임포트 완료
- [ ] 데이터 무결성 검증 통과
- [ ] 외래키 제약조건 모두 만족
- [ ] 샘플 데이터 비교 검증 완료

### 애플리케이션 업데이트
- [ ] JWT 인증 시스템 배포
- [ ] 권한 관리 서비스 적용
- [ ] 기존 Supabase 의존성 제거
- [ ] 모든 API 엔드포인트 테스트 통과
- [ ] 프론트엔드 기능 테스트 통과

### 배포 및 전환  
- [ ] 프로덕션 빌드 성공
- [ ] EC2 배포 완료
- [ ] SSL 인증서 적용
- [ ] 로드 밸런서 설정
- [ ] 모니터링 및 알람 설정
- [ ] DNS 점진적 전환 완료

### 사후 검증
- [ ] 모든 핵심 기능 정상 동작
- [ ] 성능 지표 정상 범위
- [ ] 에러율 < 1%
- [ ] 사용자 피드백 정상
- [ ] 백업 시스템 정상 동작

---

## 📞 문제 해결 가이드

### 자주 발생하는 이슈

#### 1. RDS 연결 실패
```bash
# 보안 그룹 확인
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# 포트 5432 인바운드 규칙 추가
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-yyyyyy
```

#### 2. JWT 토큰 검증 실패
```typescript
// AWS Cognito JWT 검증 디버깅
console.log('JWT Headers:', jwt.decode(token, { complete: true }));

// Cognito User Pool ID 확인
aws cognito-idp describe-user-pool --user-pool-id ap-northeast-2_xxxxxxxxx
```

#### 3. 권한 오류
```typescript
// 사용자 권한 디버깅
import { PermissionService } from '@/lib/auth/permission-service';

console.log('User permissions:', PermissionService.getUserPermissions(user));
console.log('Has permission:', PermissionService.hasPermission(user, 'read:posts'));
```

#### 4. 데이터 무결성 오류
```bash
# 외래키 제약조건 확인
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint 
  WHERE contype = 'f';
"

# 중복 데이터 확인
psql -h your-rds-endpoint.amazonaws.com -U postgres -d aiedulog -c "
  SELECT email, COUNT(*) 
  FROM user_profiles 
  GROUP BY email 
  HAVING COUNT(*) > 1;
"
```

---

## 🏆 성공 기준

### 기술적 기준
- [ ] 데이터 무손실 (0.1% 미만 손실 허용)
- [ ] 응답 시간 < 2초 (95 percentile)
- [ ] 에러율 < 0.5%
- [ ] 가용성 > 99.9%

### 비즈니스 기준  
- [ ] 모든 핵심 기능 정상 동작
- [ ] 사용자 로그인/회원가입 원활
- [ ] 게시글/댓글 작성 정상
- [ ] 채팅 기능 실시간 동작
- [ ] 관리자 기능 모두 접근 가능

### 운영 기준
- [ ] 모니터링 알람 정상 동작
- [ ] 백업 시스템 자동화
- [ ] 로그 수집 및 분석 가능
- [ ] 장애 대응 절차 문서화

---

## 📚 추가 자료

### 문서
- [AWS RDS PostgreSQL 설정 가이드](https://docs.aws.amazon.com/rds/latest/userguide/)
- [NextAuth.js JWT 설정](https://next-auth.js.org/configuration/options#jwt)
- [AWS Cognito 개발자 가이드](https://docs.aws.amazon.com/cognito/)

### 스크립트 파일
- `docs/RDS_MIGRATION_DDL.sql` - 데이터베이스 스키마
- `scripts/extract-production-data.js` - 데이터 추출
- `scripts/validate-migration.js` - 데이터 검증
- `src/lib/auth/jwt-middleware.ts` - JWT 인증 미들웨어
- `src/lib/auth/permission-service.ts` - 권한 관리 서비스

### 연락처
- **개발팀**: [연락처]
- **AWS 지원**: AWS Support Case
- **긴급상황**: [24시간 연락처]

---

**마지막 업데이트**: 2024년 12월 (마이그레이션 가이드 v1.0)  
**작성자**: Claude Code Assistant  
**리뷰**: 개발팀