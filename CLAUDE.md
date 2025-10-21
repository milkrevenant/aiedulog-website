# Claude Code 프로젝트 설정

**⭐ 시작 전 필독**: `STATUS.md` - 프로젝트 현재 상태 확인

---

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
# 1. 현재 상태 확인
cat STATUS.md

# 2. Port 3000 확인 및 정리
# Mac/Linux: lsof -ti:3000 | xargs kill -9
# Windows: powershell -Command "Stop-Process -Id [PID] -Force"

# 3. 개발 서버 시작
cd aiedulog
npm install  # Required when switching OS
npm run dev  # Always use port 3000 only
```

## 📁 프로젝트 구조
- 메인 프로젝트: `/aiedulog`
- **현재 상태**: `STATUS.md` ⭐ 여기서 시작!
- 문서: `docs/README_DOCS.md`
- GitHub: https://github.com/milkrevenant/aiedulog-website

## ⚙️ Tech Stack
- **Framework**: Next.js 15.4.6 (App Router)
- **Database**: PostgreSQL (로컬 개발) / AWS RDS (프로덕션 준비됨)
- **Auth**: AWS Cognito + NextAuth.js
- **UI**: Material UI v7 + Material 3
- **Language**: TypeScript 5.x

## 📋 ESLint Rules
Follow these rules when writing code:
- **Allow any type** - Use `any` type when necessary
- **Allow unused variables** - Temporary variables allowed during development (warning only)
- **Allow img element** - Can use HTML img tag instead of Next.js Image component
- **Alt text recommended** - Add alt text to images when possible (not required)
- **Allow anonymous default export** - Anonymous component exports are permitted

## 🎯 Current Status
- **빌드**: ✅ 성공 (타입 에러 0개)
- **코드**: ✅ 111개 파일 RDS 패턴 적용 완료
- **인프라**: ✅ EC2 + RDS 구축됨
- **배포**: ⏳ 대기 중 (로컬 개발 중)
- **자세한 현황**: `STATUS.md` 참고

## 📝 Important Notes
1. **현재 로컬 PostgreSQL 사용** (RDS 전환 대기)
2. Windows/Mac 환경 전환 시 npm install 필수
3. 개발 서버 포트: 3000 고정
4. **다음 작업 시작 전 반드시 `STATUS.md` 읽기!**

## 🔗 Quick Links
- **프로젝트 현황**: `STATUS.md` ⭐
- **문서 목록**: `docs/README_DOCS.md`
- **GitHub**: https://github.com/milkrevenant/aiedulog-website
- **AWS Console**: https://ap-northeast-2.console.aws.amazon.com/

## 🚀 Next Session 시작 방법
```bash
# 1. 상태 확인
cat STATUS.md

# 2. Git 최신 상태 확인
git status
git log --oneline -5

# 3. 작업 선택 (STATUS.md 참고)
# - Option A: RDS 전환 (30분)
# - Option B: EC2 배포 (2-3시간)
# - Option C: 기능 개발 계속

# 4. 개발 서버 시작
npm run dev
```

---

**마지막 업데이트**: 2025-10-21
