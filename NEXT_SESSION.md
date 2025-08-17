# 다음 세션 시작 체크리스트

## ✅ 빠른 시작
```bash
cd aiedulog
npm run dev
# http://localhost:3000
```

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
- ✅ 랜딩 페이지 콘텐츠 관리 시스템 완료
  - 4개 관리 페이지 (연수, 모임, 뉴스, 공지사항)
  - MUI x-date-pickers 통합
  - Supabase client import 수정

## 💡 참고사항
- Admin 권한 필요 (AuthGuard 사용)
- 날짜 선택: @mui/x-date-pickers 사용
- 파일 업로드: Supabase Storage 사용

---
*업데이트: 2025-08-18*