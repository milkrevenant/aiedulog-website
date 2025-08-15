# AIedulog 개발 TODO List

## 🎯 프로젝트 개요
**AIedulog** - 전남에듀테크교육연구회 커뮤니티 플랫폼
- 교사들을 위한 복합 기능 커뮤니티 (자료공유, 소통, 강의홍보, 구인구직, 전문칼럼, 연구회활동)
- Material 3 디자인 시스템 기반
- Supabase + Next.js 15 스택

## 🔄 현재 진행 상황
- ✅ Next.js 15.4.6 프로젝트 생성 (`/aiedulog` 폴더)
- ✅ Supabase 프로젝트 생성 및 연결
- ✅ Material 3 디자인 시스템 적용 (MUI)
- ✅ 홈페이지 구현 (전남에듀테크교육연구회)
- ✅ 네비게이션 바 구현
- ✅ DB 스키마 재설계 (커뮤니티 플랫폼용)
- 🚧 로그인 시스템 구현 중

## 📋 Phase 1: 프로젝트 초기 설정 ✅

### 완료된 작업
1. **Supabase 설정**
   - 프로젝트 ID: nnfpdhtpbjijdctslexc
   - 환경변수 설정 (SUPABASE_URL, SUPABASE_KEY)
   - MCP Supabase 연동 완료

2. **Material 3 디자인 시스템**
   - MUI 설치 및 테마 설정
   - Dynamic Color Scheme 적용
   - 커스텀 컴포넌트 스타일링

3. **프로젝트 구조**
   ```
   src/
   ├── app/
   │   ├── theme/         # Material 3 테마
   │   ├── auth/          # 인증 페이지
   │   └── dashboard/     # 대시보드
   ├── components/
   │   └── Navbar.tsx     # 네비게이션 바
   ├── lib/
   │   ├── supabase/      # Supabase 클라이언트
   │   └── database.sql   # DB 스키마
   └── types/
   ```

## 📋 Phase 2: 데이터베이스 & 인증

### ✅ 완료된 테이블 구조
1. **profiles** - 사용자 프로필 (학교, 과목, 강사정보)
2. **posts** - 게시글 (6가지 카테고리)
3. **comments** - 댓글/대댓글
4. **resources** - 교육자료
5. **lectures** - 강의 정보
6. **job_posts** - 구인/구직
7. **columns** - 전문 칼럼
8. **column_authors** - 칼럼 작성자 인증
9. **likes**, **bookmarks**, **notifications**
10. **chat_rooms**, **chat_messages**

### 🚧 진행 중
- [ ] 회원 유형별 권한 시스템 (admin, moderator, verified, member)
- [ ] Google/Apple OAuth 설정 (나중에)
- [ ] 이메일/비밀번호 로그인 시스템

## 📋 Phase 3: 핵심 기능 구현

### 우선순위 기능
1. **자료 공유** 
   - 파일 업로드/다운로드
   - 과목별/학년별 분류
   - 검색 및 필터링

2. **커뮤니티 게시판**
   - 카테고리별 게시판 (잡담, 수업고민 등)
   - 댓글/대댓글
   - 좋아요/북마크

3. **강의 홍보**
   - 강의 등록/수정
   - 참가 신청
   - 일정 관리

4. **구인구직**
   - 강사 구인/구직 게시
   - 연락처 공유
   - 매칭 시스템

5. **전문 칼럼**
   - 인증된 작성자 시스템
   - 칼럼 작성/편집
   - 추천 칼럼

## 🎨 디자인 시스템 원칙

### Material 3 적용 가이드
1. **초기 설계부터 Material 3 적용**
   - 모든 컴포넌트는 MUI 기반
   - 커스텀 테마 일관성 유지
   - Dynamic Color 활용

2. **반응형 디자인**
   - 모바일 (xs): 2열 그리드
   - 태블릿 (sm): 2열 그리드
   - 데스크톱 (md): 3열 그리드

3. **일관된 스타일링**
   - borderRadius: 12px (카드)
   - borderRadius: 20px (버튼)
   - Elevation 단계별 그림자

## 🎯 현재 작업 목록
1. ✅ Material 3 디자인 시스템 설정
2. ✅ 홈페이지 레이아웃 구현
3. ✅ 네비게이션 바 구현
4. ✅ 주요 기능 카드 균등 배치
5. ✅ 로그인 페이지 Material 3 재구성
6. ✅ 회원 권한 시스템 구현
7. ⏳ 권한 시스템 DB 적용 (SQL 실행 필요)
8. ⏳ 대시보드 재구성
9. ⏳ 게시판 CRUD 구현
10. ⏳ 파일 업로드 시스템

## 🎯 다음 단계
1. Supabase에서 권한 시스템 SQL 실행
2. 대시보드 메인 화면 구현 (역할별 UI)
3. 게시글 작성/목록 페이지
4. 파일 업로드 컴포넌트
5. 실시간 알림 시스템

## 📝 다음 세션에 할 일
1. **Supabase SQL Editor에서 실행**
   - `src/lib/roles-update.sql` 실행
   - 관리자 계정 설정 (본인 이메일)
   - 권한 시스템 테스트

2. **대시보드 구현**
   - 역할별 대시보드 카드
   - 권한별 통계 표시
   - 빠른 메뉴 권한 체크

## 💡 중요 인사이트
1. **Material 3 우선**: 모든 UI 컴포넌트는 처음부터 Material 3로 설계
2. **복합 기능 플랫폼**: 단순 게시판이 아닌 교사 커뮤니티의 종합 플랫폼
3. **모바일 최적화**: 교사들의 모바일 사용 고려한 반응형 디자인
4. **확장 가능한 구조**: 기능 추가가 용이한 모듈화된 설계

## 🔗 참고 문서
- Material 3 가이드: https://m3.material.io/
- MUI 문서: https://mui.com/material-ui/
- Supabase 문서: https://supabase.com/docs
- 진행상황: `/PROGRESS.md`
- 체크리스트: `/checklist/aiedulog_development_checklist.md`

## ✅ 주요 완료 항목
- Supabase 프로젝트 생성 및 연결
- Material 3 테마 시스템 구축
- 홈페이지 완성 (6개 주요 기능 카드)
- 네비게이션 바 (반응형)
- DB 스키마 설계 (13개 테이블)
- Grid 레이아웃 문제 해결 (Flexbox 사용)

## 🚀 배포 계획 (AWS)
- **개발**: Supabase (빠른 프로토타이핑)
- **프로덕션**: AWS 전환
  - EC2: Next.js 애플리케이션 서버
  - RDS: PostgreSQL 데이터베이스
  - S3: 정적 파일 및 업로드 파일 저장
  - CloudFront: CDN
  - Route 53: 도메인 관리

---
*최종 업데이트: 2025-08-15*
*작업 환경: macOS (16GB RAM)*
*개발 스택: Next.js 15 + Supabase + Material UI*
*프로덕션 스택: Next.js 15 + AWS (EC2, RDS, S3, CloudFront)*