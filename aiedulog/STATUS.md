# 🎯 AIedulog 프로젝트 현황

**업데이트**: 2025-10-21
**상태**: ✅ 개발 중 (Docker PostgreSQL)

---

## 📊 현재 상태

### ✅ 완료된 것들

#### 1. 개발 환경

- **프레임워크**: Next.js 15.4.6 (App Router)
- **UI**: Material UI v7 + Material 3
- **언어**: TypeScript 5.x
- **빌드 상태**: ✅ 성공 (타입 에러 0개)
- **로컬 DB**: ✅ Docker PostgreSQL (port 5433, 22 tables)
- **개발 서버**: ✅ 실행 중 (http://localhost:3000)
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

#### 4. 최근 수정 사항 (2025-11-25)

- **인증 오류 수정**: `www.aiedulog.com` 500 에러 해결을 위한 환경변수 검증 로직 추가
  - `amplify.yml`: 빌드 시 필수 환경변수(`COGNITO_*`, `NEXTAUTH_*`) 체크
  - `auth-options.ts`: 런타임 시 환경변수 누락 시 명시적 에러 발생

---

## 🔄 진행 중

### 1. EC2 프로덕션 배포 (보류 - 네트워크 제약)

**현재**: SSH 포트 22 ISP 차단으로 중단, 다음 세션 대기
**목표**: Session Manager 또는 다른 네트워크에서 배포 완료
**우선순위**: 중간 (네트워크 환경 변경 필요)

**완료된 작업**:

- [x] EC2 소프트웨어 설치 (Node.js 20.19.5, Nginx 1.24.0, PM2 6.0.13)
- [x] GitHub 코드 클론 (main 브랜치)
- [x] 환경변수 설정 (.env.production - RDS prod 연결)
- [x] RDS dev 인스턴스 중지 ($18.50/월 절감)
- [x] Elastic IP 할당 (13.125.42.155 - 고정 IP)
- [x] 로컬에서 Next.js 프로덕션 빌드 완료
- [x] 네트워크 문제 확인: 포트 80 ✅, 포트 22 ❌ (ISP 차단)
- [x] EC2 중지 (비용 절감)

**다음 세션 해결 방안**:

1. **AWS Systems Manager Session Manager** 설정 (SSH 불필요, IAM Role 추가 필요)
2. 다른 네트워크에서 SSH 접속 (집, 카페, VPN 등)
3. **대안**: AWS Amplify 계속 사용 (이미 배포 중)

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

- **로컬 개발**: `.env.local` (Docker PostgreSQL - port 5433)
- **Docker**: `docker-compose.yml` (PostgreSQL 15 Alpine)
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

### ✅ 완료: Docker PostgreSQL 개발 환경

**상태**: 완료 (2025-10-21)
**결과**:

- Docker PostgreSQL 컨테이너 실행 중 (port 5433)
- 22개 테이블 생성됨
- Next.js 개발 서버 실행 중 (http://localhost:3000)

```bash
# Docker 상태 확인
docker ps | grep aiedulog
# aiedulog-dev-db (healthy) 0.0.0.0:5433->5432/tcp

# 개발 서버 시작 (이미 실행 중)
npm run dev
# http://localhost:3000
```

### Option A: 기능 개발 계속 (추천)

**시간**: 즉시
**목표**: Phase 3 핵심 기능 완성

```bash
# 개발 서버 이미 실행 중
# http://localhost:3000

# 다음 작업:
# - Lecture 시스템 완성
# - Calendar 통합
# - Job board 구현
```

### Option B: EC2 프로덕션 배포

**시간**: 2-3시간
**목표**: 프로덕션 환경 구축

```bash
# 1. EC2 SSH 접속
ssh -i ~/aiedulog-ec2-instance-stillalice.pem ec2-user@3.39.239.83

# 2. 소프트웨어 설치 스크립트 실행
# 3. 앱 배포
```

---

## 💰 월간 비용

### 현재 (2025-10)

```
RDS dev: $0/월 (중지됨 ✅)
RDS prod: $18.50/월 (운영 중)
EC2: $0/월 (프리티어)
합계: $18.50/월
```

### 최적화 완료

- ✅ RDS dev 중지 완료 ($18.50/월 절감)
- ✅ 로컬 개발은 Docker PostgreSQL 사용
- **목표 달성**: $18.50/월

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

# 2. Docker 컨테이너 시작 (자동 재시작 설정됨)
docker ps | grep aiedulog
# 만약 중지되어 있다면:
# docker-compose up -d

# 3. 로컬 개발 서버 시작
cd aiedulog
npm run dev

# 4. 작업 선택
# - Option A: 기능 개발 계속 (추천)
# - Option B: EC2 배포 (2-3시간)
```

---

**마지막 업데이트**: 2025-10-21
**다음 리뷰**: RDS 전환 또는 EC2 배포 완료 시
