# Claude Code 프로젝트 설정

## 🔑 Supabase API 키 정보
- **새로운 키 형식만 사용** (sb_publishable_... / sb_secret_... 형식)
- 레거시 JWT 키 (anon/service_role) 사용 안함!
- 환경변수명: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 💻 Development Environment
- **Primary**: Mac (usual development)
- **Secondary**: Windows (desktop)
- node_modules는 OS별로 다시 설치 필요

### OS-Specific Instructions
**IMPORTANT**: Check the current OS and adapt commands accordingly:
- **Windows**: Use PowerShell for process management (`Stop-Process`), paths use backslash
- **Mac/Linux**: Use standard Unix commands (`kill`, `lsof`), paths use forward slash
- **Port Management**: Always kill existing processes on port 3000 before starting new server
- **npm install**: Required when switching between OS due to platform-specific dependencies

## 🚀 Starting the Project
```bash
# Check and kill port 3000 first (OS-specific)
# Windows: powershell -Command "Stop-Process -Id [PID] -Force"
# Mac/Linux: kill -9 [PID] or lsof -ti:3000 | xargs kill -9

cd aiedulog
npm install  # Required when switching OS
npm run dev  # Always use port 3000 only
```

## 📁 프로젝트 구조
- 메인 프로젝트: `/aiedulog`
- 진행 상황: `PROGRESS.md`
- 할 일 목록: `TODO.md`
- 다음 세션 가이드: `NEXT_SESSION.md`

## ⚙️ stack
- Next.js 15.4.6 (App Router)
- Supabase (PostgreSQL)
- Material UI v6 + Material 3
- TypeScript

## 📋 ESLint Rules
Follow these rules when writing code:
- **Allow any type** - Use `any` type when necessary
- **Allow unused variables** - Temporary variables allowed during development (warning only)
- **Allow img element** - Can use HTML img tag instead of Next.js Image component
- **Alt text recommended** - Add alt text to images when possible (not required)
- **Allow anonymous default export** - Anonymous component exports are permitted

## 🎯 progress
- Phase 1-2: ✅ 100% 완료
- Phase 3: 🔄 60% 진행 중
- 최근 완료: 파일 업로드 시스템

## 📝 caution
1. Supabase 키는 이미 새 형식 사용 중
2. Windows/Mac 환경 전환 시 npm install 필수
3. 개발 서버 포트: 3000 또는 3001 (자동 할당)

## 🔗 Related Links
- GitHub: https://github.com/milkrevenant/aiedulog-website
- Supabase: https://supabase.com/dashboard/project/njnrezduzotxfombfanu