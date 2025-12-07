# Parallel Task Distribution

## Task 1: Dashboard Profile Sync (Claude)
**목표**: 로그인한 사용자의 프로필 정보가 Dashboard에 올바르게 표시되도록

**현재 문제**:
- `useAuth` 훅에서 `profile`이 null일 수 있음
- Cognito sub와 DB의 `user_profiles` 테이블 연결 필요

**관련 파일**:
- `src/app/dashboard/page.tsx` - Dashboard 페이지
- `src/lib/auth/hooks.ts` - useAuth 훅
- `src/lib/identity/helpers.ts` - getUserIdentity 함수
- `src/lib/auth/auth-options.ts` - NextAuth 설정

**DB 테이블**:
- `user_profiles` - 사용자 프로필 (user_id, display_name, role, avatar_url 등)
- `auth_methods` - 인증 방법 (provider_id = Cognito sub)

**테스트 계정**:
- Email: `stillalice@njgs.hs.jne.kr`
- Cognito Sub: `64189d1c-6081-705d-bd6e-07e122b56600`
- Group: `admin`

---

## Task 2: Lecture System (Codex)
**목표**: 강의 시스템 완성

**현재 상태**:
- `/board/lectures` - 강의 목록 페이지 (존재)
- `/admin/lectures` - 강의 관리 페이지 (존재)

**필요 작업**:
1. 강의 목록 조회 기능 확인
2. 강의 상세 페이지 구현 (`/board/lectures/[id]`)
3. 강의 등록/수정 기능 (admin/verified 권한)
4. 강의 카테고리 필터링

**관련 파일**:
- `src/app/board/lectures/page.tsx`
- `src/app/admin/lectures/page.tsx`
- `src/app/admin/lectures/LecturesClient.tsx`

**DB 테이블** (확인 필요):
- `lectures` 또는 `training_programs`

---

## Task 3: Calendar Integration (Gemini)
**목표**: 일정/캘린더 기능 구현

**현재 상태**:
- Calendar 관련 파일 없음 (새로 만들어야 함)

**필요 작업**:
1. `/calendar` 페이지 생성
2. 월별/주별 일정 보기
3. 일정 추가/수정/삭제 (권한별)
4. 행사, 연수, 회의 등 카테고리

**참고할 기존 컴포넌트**:
- MUI DateCalendar 또는 FullCalendar 라이브러리
- 기존 UI 스타일: Material UI v7 + Material 3

**DB 테이블** (새로 생성 필요):
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  category VARCHAR(50), -- 'event', 'training', 'meeting'
  created_by UUID REFERENCES user_profiles(user_id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Task 4: Job Board (추가 가능)
**현재 상태**:
- `/board/job` - 구인구직 페이지 (존재)
- `/board/job/[subCategory]` - 서브카테고리 (존재)

**확인 필요**:
- 기능 동작 여부
- 권한 설정 (verified 이상만 작성 가능)

---

## 공통 정보

**Tech Stack**:
- Next.js 15.4.6 (App Router)
- TypeScript 5.x
- Material UI v7
- PostgreSQL (Docker 로컬, port 5433)

**인증**:
- AWS Cognito + NextAuth.js
- 세션: `session.user.groups` 배열에 권한 포함

**권한 체계**:
- `admin`: 전체 관리
- `moderator`: 콘텐츠 관리
- `verified`: 인증 교사 (칼럼/강의 등록)
- `member`: 일반 회원

**개발 서버**: http://127.0.0.1:3000
