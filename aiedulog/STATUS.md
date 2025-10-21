# 🎯 AIedulog 프로젝트 현황

**업데이트**: 2025-10-21
**상태**: 개발 중 (로컬 PostgreSQL)

---

## 📊 현재 상태

### ✅ 완료된 것들

#### 1. 개발 환경
- **프레임워크**: Next.js 15.4.6 (App Router)
- **UI**: Material UI v7 + Material 3
- **언어**: TypeScript 5.x
- **빌드 상태**: ✅ 성공 (타입 에러 0개)
- **로컬 DB**: PostgreSQL (localhost)
- **인증**: AWS Cognito + NextAuth.js

#### 2. 코드베이스
- **111개 파일** Supabase → RDS 패턴 적용 완료
- RDS 클라이언트 인프라 구축됨:
  - `src/lib/db/rds-client.ts` (Connection pool)
  - `src/lib/db/rds-query-builder.ts` (Query builder)
  - `src/lib/supabase/rds-adapter.ts` (Adapter)
- Dual DB 지원: Supabase + RDS 코드 공존

#### 3. AWS 인프라
- **RDS**: 2개 인스턴스 (dev, prod) - available
  - `aiedulog-dev-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com`
  - `aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com`
- **EC2**: 1개 인스턴스 (running)
  - `i-0552c33a0ade674ff` (3.39.239.83)
  - Name: aiedulog-prod-ec2
- **비용 최적화**: ELB 삭제 완료 ($16/월 절감)

---

## 🔄 진행 중

### 1. 데이터베이스 전환 (미완료)
**현재**: 로컬 PostgreSQL 사용 중
**목표**: AWS RDS 사용

**필요한 작업**:
- [ ] 로컬 DB → RDS 스키마 동기화 확인
- [ ] RDS 보안 그룹 설정 (로컬 IP 허용)
- [ ] .env.local DATABASE_URL을 RDS로 변경
- [ ] 연결 테스트

### 2. EC2 프로덕션 배포 (미완료)
**현재**: EC2 인스턴스만 존재, 앱 미배포
**목표**: EC2에 Next.js 앱 배포

**필요한 작업**:
- [ ] EC2 소프트웨어 설치 (Node.js, Nginx, PM2)
- [ ] GitHub 코드 클론
- [ ] 환경변수 설정
- [ ] 앱 빌드 및 실행
- [ ] Nginx 리버스 프록시 설정
- [ ] SSL 인증서 (Let's Encrypt)

---

## ⏳ 대기 중

### Phase 3: 핵심 기능 완성
- Lecture 시스템 완성
- Calendar 통합
- Job board 구현

### Phase 4: 고급 기능
- AI 챗봇
- Analytics 대시보드
- 모바일 앱

---

## 📁 중요 파일 및 정보

### 환경 설정
- **로컬 개발**: `.env.local` (localhost PostgreSQL)
- **마이그레이션**: `.env.migration` (RDS 접속 정보)

### AWS 리소스
```bash
# RDS
Host: aiedulog-prod-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com
Port: 5432
User: app_user
Database: postgres

# EC2
Instance: i-0552c33a0ade674ff
IP: 3.39.239.83
Key: aiedulog-ec2-instance-stillalice.pem
```

### GitHub
- Repository: https://github.com/milkrevenant/aiedulog-website
- Branch: main (auto-deploy to Amplify)

---

## 🚀 즉시 실행 가능한 다음 작업

### Option A: RDS로 전환 (추천)
**시간**: 30분
**목표**: 로컬 개발도 RDS 사용

```bash
# 1. RDS 보안 그룹에 내 IP 추가 (AWS Console)
# 2. .env.local 수정
DATABASE_URL=postgresql://app_user:[PASSWORD]@aiedulog-dev-db.c72yk0k24dsh.ap-northeast-2.rds.amazonaws.com:5432/postgres

# 3. 연결 테스트
npm run dev
# localhost:3000 접속 확인
```

### Option B: EC2 배포 시작 (시간 많이 소요)
**시간**: 2-3시간
**목표**: 프로덕션 환경 구축

```bash
# 1. EC2 SSH 접속
ssh -i ~/aiedulog-ec2-instance-stillalice.pem ec2-user@3.39.239.83

# 2. 소프트웨어 설치 스크립트 실행
# (EC2RDS.md의 초기 설정 스크립트 참고)

# 3. 앱 배포
```

### Option C: 로컬 개발 계속 (현재 상태 유지)
**시간**: 0분
**목표**: 기능 개발 계속

```bash
# 현재대로 로컬 PostgreSQL 사용
npm run dev
```

---

## 💰 월간 비용

### 현재 (2025-10)
```
RDS dev: $18.50/월
RDS prod: $18.50/월 (중지 가능)
EC2: $0/월 (프리티어)
합계: $18.50-37/월
```

### 최적화 방안
- RDS prod 중지 (개발 완료 후까지)
- Dev 환경은 로컬 PostgreSQL 사용
- 목표: $0-20/월

---

## 📝 참고 문서

### 활성 문서 (읽을 것)
- `CLAUDE.md` - 프로젝트 설정 및 규칙
- `docs/DATABASE_SCHEMA_REFERENCE.md` - DB 스키마
- `docs/DEVELOPMENT_GUIDE.md` - 개발 가이드
- `docs/AUTH_REFERENCE.md` - 인증 시스템

### 아카이브 (필요시만)
- `docs/_archived/SUPABASE_TO_RDS_MIGRATION_GUIDE.md` - RDS 마이그레이션 전체 기록
- `docs/_archived/MIGRATION_COMPLETE_SUMMARY.md` - 111개 파일 마이그레이션 통계
- `docs/_archived/IDENTITY_SYSTEM_FIX.md` - auth.user.id 버그 수정

---

## 🎯 다음 세션 시작 방법

```bash
# 1. 이 파일 읽기
cat STATUS.md

# 2. Git 상태 확인
git status
git log --oneline -5

# 3. 로컬 개발 서버 시작
cd aiedulog
npm run dev

# 4. 작업 선택
# - Option A: RDS 전환 (30분)
# - Option B: EC2 배포 (2-3시간)
# - Option C: 기능 개발 계속
```

---

**마지막 업데이트**: 2025-10-21
**다음 리뷰**: RDS 전환 또는 EC2 배포 완료 시
