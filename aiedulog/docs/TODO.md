# TODO List - AIedulog 프로젝트

## 📋 현재 Phase 3: 핵심 기능 구현
- [x] 랜딩 페이지 콘텐츠 관리 시스템
- [x] 회원가입 시스템
- [x] SQL 마이그레이션 시스템 구축 ✅ NEW
- [x] MFA UI 구현 (TOTP, WebAuthn) ✅ NEW
- [ ] 강의 신청 기능 (공개 페이지)
- [ ] 일정 관리 달력
- [ ] 구인구직 게시판

## 📋 Phase 4: 고급 기능 (예정)
- [ ] AI 챗봇 통합
- [ ] 데이터 분석 대시보드
- [ ] 알림 자동화 시스템
- [ ] 모바일 앱 개발

## 📋 Phase 5: 최적화 및 배포
- [ ] 성능 최적화
- [ ] SEO 최적화
- [x] ~~AWS 배포~~ → Vercel 배포 (완료!)
- [ ] 도메인 연결 (가비아 DNS 설정 대기)

## 🔧 기술 스택
- **Frontend**: Next.js 15.4.6, Material UI v7
- **Backend**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Date**: @mui/x-date-pickers + date-fns

## 🔗 주요 링크
- GitHub: https://github.com/milkrevenant/aiedulog-website
- Supabase: https://supabase.com/dashboard/project/njnrezduzotxfombfanu

## 🔧 다음 세션 태스크

### 코드 품질 (High Priority)
- [ ] ESLint 에러 140개 해결 (any 타입)
- [ ] ESLint 경고 226개 중 50% 감소
- [ ] React Hooks 의존성 배열 수정

### 기능 구현
- [ ] 강의 목록 페이지 (/lectures)
- [ ] 강의 상세 페이지 (/lectures/[id])
- [ ] 참가 신청 버튼 및 로직

### 배포
- [ ] 가비아 도메인 연결

---
*프로젝트 시작: 2025-08-15*
*현재 진행률: Phase 3 (75%)*
*마지막 업데이트: 2025-08-20 15:00*