# TODO List - AIedulog 프로젝트

## 📋 현재 Phase 3: 핵심 기능 구현
- [x] 랜딩 페이지 콘텐츠 관리 시스템
- [x] 회원가입 시스템
- [x] SQL 마이그레이션 시스템 구축
- [x] MFA UI 구현 (TOTP, WebAuthn)
- [x] 채팅 시스템 협업 도구 통합 ✅ NEW
- [x] AWS Amplify 배포 파이프라인 구축 ✅ NEW
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
- [x] AWS Amplify 배포 (진행중)
- [ ] 도메인 연결 (가비아 DNS 설정 대기)

## 🔧 기술 스택
- **Frontend**: Next.js 15.4.6, Material UI v6, React 18.3.1
- **Backend**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Collaboration**: Excalidraw, Custom Kanban
- **Date**: @mui/x-date-pickers + date-fns

## 🔗 주요 링크
- GitHub: https://github.com/milkrevenant/aiedulog-website
- Supabase: https://supabase.com/dashboard/project/njnrezduzotxfombfanu

## 🔧 다음 세션 태스크 (2025-08-23)

### 패키지 업데이트 및 정리
- [ ] 불필요한 패키지 제거
- [ ] @supabase/auth-helpers-nextjs → @supabase/ssr 마이그레이션
- [ ] 패키지 취약점 해결 (npm audit fix)

### 칸반보드 구체화
- [ ] 태스크 상세 정보 편집 기능
- [ ] 태스크 라벨 및 우선순위
- [ ] 마감일 설정 기능
- [ ] 담당자 할당 기능
- [ ] 진행률 표시

### 공감 시스템 개선
- [ ] 공감 게시글 컴포넌트 개선
  - 애니메이션 효과 추가
  - 공감 타입 다양화 (좋아요, 응원, 축하 등)
- [ ] 공감 댓글 컴포넌트 개선
  - 실시간 공감 업데이트
  - 공감한 사용자 목록 표시

### 코드 품질
- [ ] TypeScript 타입 정의 개선
- [ ] 컴포넌트 리팩토링
- [ ] 성능 최적화 (React.memo, useMemo)

---
*프로젝트 시작: 2025-08-15*
*현재 진행률: Phase 3 (80%)*
*마지막 업데이트: 2025-08-22 00:50*