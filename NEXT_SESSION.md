# 🚀 다음 세션 시작 가이드

## 📖 필수 읽기 파일 (순서대로)

### 1. **PROGRESS.md**
- 현재까지 완료된 작업 확인
- 특히 "🔄 다음에 해야 할 작업" 섹션

### 2. **TODO.md** 
- 우선순위 작업 확인

### 3. **src/app/feed/page.tsx**
- 메인 피드 페이지 (실제 DB 연동됨)

### 4. **src/app/board/[category]/page.tsx**
- 카테고리별 게시판 페이지

## 🎯 바로 시작할 작업

### 우선순위 1: 사용자 관리 (Admin) 🔥
```bash
# 1. 개발 서버 시작
cd aiedulog
npm run dev
```
- `/admin/users` 페이지 완성
- 사용자 목록 및 검색
- 권한 변경 기능
- 계정 관리 기능

### 우선순위 2: 알림 시스템
- 실시간 알림 컴포넌트
- 알림 데이터베이스 설계
- 알림 목록 페이지

### 우선순위 3: 채팅 시스템
- DM 기능 구현
- 실시간 메시징
- 채팅 UI

## 📂 주요 파일 위치

### 핵심 페이지
- `/src/app/feed/page.tsx` - 메인 피드 (로그인 후 기본 페이지)
- `/src/app/search/page.tsx` - 검색 결과 페이지 ✅
- `/src/app/settings/profile/page.tsx` - 프로필 설정 페이지 ✅
- `/src/app/dashboard/page.tsx` - 마이페이지 (모든 회원)
- `/src/app/admin/page.tsx` - 관리자 대시보드
- `/src/app/admin/users/page.tsx` - 사용자 관리
- `/src/app/board/[category]/page.tsx` - 게시판
- `/src/app/post/[id]/page.tsx` - 게시글 상세
- `/src/components/AppHeader.tsx` - 공통 헤더 (검색바 포함) ✅
- `/src/components/Navbar.tsx` - 네비게이션 바

### 데이터베이스
- `/src/lib/posts-table.sql` - 게시판 DB 스키마
- `/src/lib/roles-update.sql` - 권한 시스템
- `/src/lib/user-management.sql` - 사용자 관리 DB
- `/src/lib/add-image-columns.sql` - 이미지 컬럼 추가 ✅
- `/src/lib/add-nickname.sql` - 닉네임 컬럼 추가 ✅
- `/src/lib/avatars-bucket-setup.sql` - 아바타 저장소 설정 ✅

### 권한 시스템
- `/src/lib/auth/permissions.ts` - 권한 정의
- `/src/hooks/usePermission.ts` - 권한 확인 hook

## 💡 현재 상태 요약

### ✅ 완료된 것
- 홈페이지
- 로그인/회원가입  
- 권한 시스템 (admin, moderator, verified, member)
- 소셜 피드 (인스타그램 스타일)
- 게시판 CRUD (작성, 읽기, 좋아요, 북마크)
- 4개 카테고리 게시판
- Reddit 스타일 사이드바
- 게시글 상세 페이지
- 댓글 시스템 (대댓글 포함)
- 게시글 수정/삭제
- 사용자 관리 페이지
- 관리자 대시보드
- **이미지 업로드 시스템** ✅ (2025-08-16)
  - 피드 이미지 업로드
  - 여러 이미지 표시
  - 게시글 상세 이미지 표시
- **검색 기능** ✅ (2025-08-16)
  - AppHeader 검색바 활성화
  - 검색 결과 페이지
  - 게시글/사용자/태그 통합 검색
- **프로필 아바탄 시스템** ✅ (2025-08-16)
  - 프로필 설정 페이지
  - 아바타 업로드/변경/삭제
  - 전체 UI에 프로필 사진 반영
- **닉네임 기능** ✅ (2025-08-16)
  - 닉네임 수정 기능
  - 전체 UI에 닉네임 우선 표시

### ⏳ 해야 할 것 (우선순위)
1. 사용자 관리 (Admin) 🔥
2. 알림 시스템
3. 채팅 시스템

## 🔑 테스트 계정
- Admin 계정: Supabase SQL Editor에서 설정
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = '본인이메일';
  ```
- 일반 회원: 새로 가입 후 테스트

## 🔗 빠른 링크
- Supabase: https://supabase.com/dashboard/project/nnfpdhtpbjijdctslexc
- 로컬: http://localhost:3000 (또는 :3001)
- GitHub: https://github.com/milkrevenant/aiedulog-website

## 📝 참고사항
- Material UI v7 (MUI) 사용 중
- Material 3 마이그레이션 시도했으나 되돌림 (2025-08-16)
- 모든 페이지에 AppHeader 컴포넌트 사용
- 권한별 UI 차별화 구현됨
- DB 실시간 연동 완료

---
*최종 업데이트: 2025-08-16 오후 (세션 4)*
*진행률: 전체 **85%** 완료*
*최근 완료: 검색+아바타+닉네임 기능*
*다음 작업: 사용자 관리 (Admin)*