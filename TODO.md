# AIedulog 개발 TODO List

## 🔄 현재 진행 상황
- ✅ Next.js 프로젝트 생성 완료 (`/aiedulog` 폴더)
- 🚧 Docker PostgreSQL 설정 중 (재부팅 필요)

## 📋 Phase 1: 프로젝트 초기 설정

### 1. Docker PostgreSQL 실행 (재부팅 후)
```bash
# PowerShell 또는 CMD에서
docker compose up -d

# 확인
docker ps
```

### 2. 필수 패키지 설치
```bash
cd aiedulog

# 기본 패키지
npm install drizzle-orm postgres 
npm install next-auth @auth/drizzle-adapter
npm install bcryptjs date-fns clsx react-hot-toast

# UI 라이브러리
npm install @headlessui/react @heroicons/react 
npm install react-hook-form @hookform/resolvers zod
npm install material-symbols

# 개발 도구
npm install -D drizzle-kit @types/bcryptjs
```

### 3. 환경변수 설정
```bash
# .env.local 파일 생성 (aiedulog 폴더 내)
cp ../.env.local.example .env.local

# NEXTAUTH_SECRET 생성
openssl rand -base64 32
```

### 4. Tailwind 설정 (Material 3 디자인 토큰)
`tailwind.config.ts` 수정:
- 컬러 시스템 추가
- 폰트 크기 토큰 추가
- Border radius 토큰 추가
- Shadow (elevation) 토큰 추가

### 5. 폰트 설정
`src/app/layout.tsx`:
- Roboto, Noto Sans KR 폰트 import
- 폰트 변수 적용

### 6. 프로젝트 구조 생성
```
src/
├── components/
│   ├── layout/
│   ├── ui/
│   └── auth/
├── lib/
│   ├── db/
│   └── auth/
├── hooks/
└── types/
```

## 📋 Phase 2: 데이터베이스 & 인증

### 1. Drizzle 스키마 설정
- `src/lib/db/schema.ts` 생성
- 테이블 정의 (users, boards, posts, comments 등)

### 2. Drizzle 설정
- `drizzle.config.ts` 생성
- `src/lib/db/index.ts` - DB 연결

### 3. 마이그레이션
```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### 4. NextAuth 설정
- `src/app/api/auth/[...nextauth]/route.ts`
- Google OAuth 설정 (Google Cloud Console)
- 미들웨어 설정

## 🎯 오늘의 목표
1. ✅ Next.js 프로젝트 생성
2. 🔄 Docker PostgreSQL 실행 (재부팅 후)
3. ⏳ 필수 패키지 설치
4. ⏳ Material 3 디자인 토큰 설정
5. ⏳ 기본 프로젝트 구조 생성

## 💡 메모
- Docker Desktop 재부팅 후 자동 시작 확인
- PostgreSQL 기본 포트: 5432
- 데이터베이스명: aiedulog_dev
- 사용자명: aiedulog
- 비밀번호: aiedulog2024!

## 🔗 참고
- 전체 체크리스트: `/checklist/README.md`
- Phase 1 상세: `/checklist/phase1_initial_setup.md`
- Phase 2 상세: `/checklist/phase2_database_auth.md`
- 진행상황: `/PROGRESS.md`

---
*저장 시각: 2024-01-14*
*재부팅 후 이 파일을 참고하여 계속 진행*