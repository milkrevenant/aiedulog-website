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

### 우선순위 1: 게시글 상세 페이지
```bash
# 1. 개발 서버 시작
cd /Users/stillclie_mac/Documents/ug/aideulog/aiedulog
npm run dev

# 2. 구현할 파일
src/app/post/[id]/page.tsx  # 게시글 상세 페이지
```

### 우선순위 2: 댓글 시스템
- comments 테이블 이미 생성됨
- 댓글 작성/삭제 기능 구현
- 대댓글 지원

### 우선순위 3: 게시글 수정/삭제
- 작성자만 수정/삭제 가능
- 관리자는 모든 글 삭제 가능

## 📂 주요 파일 위치

### 핵심 페이지
- `/src/app/feed/page.tsx` - 메인 피드
- `/src/app/board/[category]/page.tsx` - 게시판
- `/src/app/dashboard/page.tsx` - 마이페이지
- `/src/components/AppHeader.tsx` - 공통 헤더

### 데이터베이스
- `/src/lib/posts-table.sql` - 게시판 DB 스키마
- `/src/lib/roles-update.sql` - 권한 시스템

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

### ⏳ 해야 할 것 (우선순위)
1. 게시글 상세 페이지
2. 댓글 시스템
3. 게시글 수정/삭제
4. 사용자 관리 (Admin)
5. 파일 업로드
6. 알림 시스템

## 🔑 테스트 계정
- Admin 계정: Supabase에서 확인
- 일반 회원: 새로 가입 후 테스트

## 🔗 빠른 링크
- Supabase: https://supabase.com/dashboard/project/nnfpdhtpbjijdctslexc
- 로컬: http://localhost:3000
- GitHub: https://github.com/milkrevenant/aiedulog-website

## 📝 참고사항
- Material 3 디자인 시스템 적용됨
- 모든 페이지에 AppHeader 컴포넌트 사용
- 권한별 UI 차별화 구현됨
- DB 실시간 연동 완료

---
*작성일: 2025-08-15 저녁*
*진행률: 전체 60% 완료*