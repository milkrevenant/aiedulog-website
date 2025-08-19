# TODO List - AIedulog 프로젝트

## 📋 현재 Phase 3: 핵심 기능 구현
- [x] 랜딩 페이지 콘텐츠 관리 시스템
  - [x] 연수 프로그램 관리
  - [x] 정기 모임 관리
  - [x] 뉴스 관리
  - [x] 공지사항 관리
- [x] 회원가입 시스템
  - [x] 3단계 가입 프로세스
  - [x] 실시간 이메일 중복 체크
  - [x] 프로필 확장 필드 (school, interests)
  - [ ] 이메일 인증 테스트
- [ ] 강의 홍보 시스템
  - [ ] 강의 등록/수정 페이지
  - [ ] 참가 신청 기능
  - [ ] 일정 관리 달력
- [ ] 구인구직 게시판
  - [ ] 전문 구인구직 페이지
  - [ ] 연락처 공유 시스템
  - [ ] 매칭 알고리즘

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
- Supabase: https://supabase.com/dashboard/project/nnfpdhtpbjijdctslexc

## 🔧 긴급 작업
- [ ] Supabase profiles 테이블 SQL 실행 (`/src/lib/add-profile-fields.sql`)
- [ ] 회원가입 후 이메일 인증 테스트
- [ ] Vercel 재배포 확인

---
*프로젝트 시작: 2025-08-15*
*현재 진행률: Phase 3 (75%)*
*마지막 업데이트: 2025-08-19 15:30*