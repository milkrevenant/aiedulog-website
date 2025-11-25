# 다음 세션 시작 가이드

**마지막 업데이트**: 2025-10-21 23:30

---

## ✅ 방금 완료한 작업

### 1. Docker PostgreSQL 개발 환경 구축
- Docker Compose로 PostgreSQL 15 컨테이너 설정 완료
- Port 5433으로 실행 중 (로컬 PostgreSQL 5432와 충돌 방지)
- 22개 테이블 생성 확인
- Next.js 개발 서버 연결 성공 (http://localhost:3000)

### 2. EC2 프로덕션 배포 (차단 - SSH 포트 문제)
- EC2 소프트웨어 설치 완료 (Node.js 20.19.5, PM2 6.0.13, Nginx 1.24.0)
- GitHub 코드 클론 완료 (main 브랜치)
- 환경변수 설정 완료 (.env.production - RDS prod 연결)
- RDS dev 인스턴스 중지 ($18.50/월 절감)
- Elastic IP 할당 (13.125.42.155)
- 로컬 프로덕션 빌드 완료
- **현재 문제**: SSH 포트 22 완전 차단 (핫스팟도 막힘)
- **해결 필요**: AWS Session Manager 설정 또는 다른 네트워크에서 SSH

### 3. 파일 정리
- 불필요한 .sh, .gz, .js 스크립트 삭제 (13개 파일)
- 아카이브 폴더 정리 (obsolete 문서 삭제)
- STATUS.md 업데이트

---

## 🎯 현재 상태

### 실행 중
- ✅ Docker PostgreSQL (port 5433)
- ✅ Next.js dev server (port 3000)

### 확인 방법
```bash
# Docker 확인
docker ps | grep aiedulog
# 출력: aiedulog-dev-db (healthy) 0.0.0.0:5433->5432/tcp

# 개발 서버 확인
# http://localhost:3000 브라우저에서 접속
```

---

## 🚀 다음 작업 (우선순위대로)

### 1. EC2 배포 - SSH 포트 차단 해결 필요 ⚠️
**우선순위**: 중간 (네트워크 환경 변경 필요)
**Elastic IP**: 13.125.42.155 (고정)
**현재 상태**: EC2 stopped (비용 절감)

**문제**: SSH 포트 22 ISP 차단 (학교/핫스팟 모두)
- 보안그룹 설정 정상 ✅
- 포트 80 연결 가능 ✅
- 포트 22 완전 차단 ❌

**해결 방법 선택**:

**Option A: AWS Session Manager** (추천 - SSH 불필요)
1. IAM Role 생성 및 EC2 연결
2. 브라우저/CLI로 Session Manager 접속
3. 배포 진행

**Option B: 다른 네트워크에서 SSH**
- 집/카페/VPN 등에서 시도
- IP: 13.125.42.155

**Option C: AWS Amplify 계속 사용**
- 이미 main 브랜치 auto-deploy 중
- EC2는 나중에

### 2. 기능 개발 (추천 - 바로 가능) ⭐
**우선순위**: 높음
**작업 항목**:
1. Lecture 시스템 완성
2. Calendar 통합
3. Job board 구현

**환경**: Docker PostgreSQL + 로컬 개발 서버 완료

---

## 📋 빠른 명령어

### 개발 시작
```bash
cd /Users/stillclie_mac/Documents/ug/aideulog/aiedulog

# Docker 확인 (자동 재시작 설정됨)
docker ps | grep aiedulog

# 개발 서버 시작
npm run dev
```

### Docker 관리
```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 로그 확인
docker-compose logs -f

# DB 접속
PGPASSWORD=aiedulog_dev_password psql -h localhost -p 5433 -U aiedulog -d aiedulog_dev
```

### 빌드 확인
```bash
npm run build  # 타입 에러 0개 확인됨
```

---

## 📁 중요 파일

### 개발 환경
- `.env.local` - Docker PostgreSQL 설정 (port 5433)
- `docker-compose.yml` - PostgreSQL 15 Alpine 설정
- `migrations/` - DB 마이그레이션 파일들

### 프로젝트 상태
- `STATUS.md` ⭐ - **필독! 전체 프로젝트 현황**
- `CLAUDE.md` - 프로젝트 설정 및 규칙
- `docs/DATABASE_SCHEMA_REFERENCE.md` - DB 스키마

---

## 🎯 추천 시작 순서

1. **STATUS.md 읽기** (2분)
   ```bash
   cat STATUS.md
   ```

2. **Docker & 개발 서버 확인** (1분)
   ```bash
   docker ps | grep aiedulog
   # http://localhost:3000 접속
   ```

3. **다음 기능 개발 시작** (즉시)
   - Lecture 시스템
   - Calendar 통합
   - Job board

---

**다음 세션에서 볼 것**: 이 파일 먼저 읽고 STATUS.md 확인
