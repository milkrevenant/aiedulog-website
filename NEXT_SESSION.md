# 다음 세션 시작 체크리스트

## ✅ 빠른 시작
```bash
cd aiedulog
npm run dev
# http://localhost:3000
```

## 🚀 배포 성공!
- **Production URL**: https://aiedulog.vercel.app
- **상태**: ✅ 성공적으로 배포됨
- **배포 날짜**: 2025-08-19 00:52

## 🔧 코드 품질 점검 필요
### 자동화 도구 명령어
```bash
# 1. TypeScript 타입 체크 (수정 없이 확인만)
npx tsc --noEmit

# 2. ESLint 검사 및 자동 수정
npx eslint src --ext ts,tsx --fix

# 3. Prettier 포맷팅
npx prettier --write "src/**/*.{ts,tsx}"

# 4. 빌드 테스트
npm run build
```

### 대용량 파일 우선 점검 (1000줄+)
- `src/components/material3/custom-components.tsx` (1486줄)
- `src/app/main/page.tsx` (1192줄)
- `src/app/board/education/[level]/page.tsx` (1045줄)
- `src/app/board/[category]/page.tsx` (1003줄)

### 현재 발견된 이슈
- Unused variables: 26개 warning
- Any types: 15개 error
- Unescaped entities: 4개 error
- Missing dependencies: 4개 warning

## 🎯 즉시 해야 할 작업 (우선순위)
1. [ ] **강의 홍보 시스템 구현**
   - `/admin/lectures` 페이지 생성
   - 강의 등록/수정 폼 구현
   - lectures 테이블 DB 스키마 작성

2. [ ] **강의 신청 기능**
   - 참가 신청 버튼 및 로직
   - 신청자 목록 관리

3. [ ] **일정 관리 달력**
   - FullCalendar 또는 MUI 달력 통합
   - 강의 일정 표시

## 📂 작업할 파일 위치
```
생성 예정:
- /src/app/admin/lectures/page.tsx
- /src/lib/lectures-system.sql
- /src/app/lectures/page.tsx (공개 페이지)

수정 예정:
- /src/app/admin/page.tsx (메뉴 추가)
```

## ⚠️ 현재 이슈/블로커
- 없음

## 📍 마지막 완료 작업
- ✅ **Vercel 배포 성공!**
  - 모든 TypeScript 에러 해결
  - MUI Grid v7 마이그레이션 완료
  - Material 3 웹 컴포넌트 타입 이슈 해결
  - useSearchParams Suspense 래핑
- ✅ 랜딩 페이지 콘텐츠 관리 시스템 완료
  - 4개 관리 페이지 (연수, 모임, 뉴스, 공지사항)
  - MUI x-date-pickers 통합
  - Supabase client import 수정

## 💡 참고사항
- Admin 권한 필요 (AuthGuard 사용)
- 날짜 선택: @mui/x-date-pickers 사용
- 파일 업로드: Supabase Storage 사용
- **배포 이슈 보고서**: `DEPLOYMENT_ISSUES_REPORT.md` 참조
- **에러 로그**: `VERCEL_BUILD_ERRORS_LOG.md` 참조

## ⚠️ 가비아 도메인 연결 대기 중
1. Vercel Dashboard → Settings → Domains
2. Add Domain → 가비아 도메인 입력
3. 가비아 DNS 설정:
   - A 레코드: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

---
*업데이트: 2025-08-19*