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

### 우선순위 1: 파일 업로드 시스템
```bash
# 1. 개발 서버 시임
cd /Users/stillclie_mac/Documents/ug/aideulog/aiedulog
npm run dev
```

### 우선순위 2: 검색 기능
- Supabase Storage 버킷 생성
- 이미지 업로드 컴포넌트
- 게시글에 이미지 첨부

### 우선순위 3: 알림 시스템
- 헤더 검색바 기능 구현
- 게시글/사용자/태그 검색
- 검색 결과 페이지

## 📂 주요 파일 위치

### 핵심 페이지
- `/src/app/feed/page.tsx` - 메인 피드 (로그인 후 기본 페이지)
- `/src/app/dashboard/page.tsx` - 마이페이지 (모든 회원)
- `/src/app/admin/page.tsx` - 관리자 대시보드
- `/src/app/admin/users/page.tsx` - 사용자 관리
- `/src/app/board/[category]/page.tsx` - 게시판
- `/src/app/post/[id]/page.tsx` - 게시글 상세
- `/src/components/AppHeader.tsx` - 공통 헤더
- `/src/components/Navbar.tsx` - 네비게이션 바

### 데이터베이스
- `/src/lib/posts-table.sql` - 게시판 DB 스키마
- `/src/lib/roles-update.sql` - 권한 시스템
- `/src/lib/user-management.sql` - 사용자 관리 DB

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
- 사용자 관리 페이지 ✅ NEW
- 관리자 대시보드 ✅ NEW

### ⏳ 해야 할 것 (우선순위)
1. 파일 업로드 시스템
2. 검색 기능
3. 알림 시스템
4. 채팅 시스템

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
- Material 3 디자인 시스템 적용됨
- 모든 페이지에 AppHeader 컴포넌트 사용
- 권한별 UI 차별화 구현됨
- DB 실시간 연동 완료

---
*작성일: 2025-08-15 새벽*
*진행률: 전체 75% 완료*