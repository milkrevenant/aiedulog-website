# AI 협업 가이드라인

## 개요
여러 AI(Claude, Codex, Gemini 등)가 동시에 작업할 때 충돌과 에러를 방지하기 위한 규칙입니다.

---

## 1. 작업 요청 템플릿

### 기본 템플릿
```
[작업 내용]
{구체적인 작업 설명}

[작업 범위]
- 새로 만들 파일: {파일 경로들}
- 수정할 파일: {파일 경로들}

[금지 사항]
- 아래 파일들은 절대 수정하지 마세요
- 다른 파일 수정이 필요하면 "어떤 코드를 추가해야 하는지"만 알려주세요

[완료 조건]
1. npm run build 성공 확인
2. 수정한 파일 목록 제출
3. 새로 설치한 패키지 목록 제출
```

### 실제 예시: Calendar 기능 추가
```
[작업 내용]
캘린더 페이지를 만들어줘. 월별 일정 조회, 일정 추가/수정/삭제 기능 포함.

[작업 범위]
- 새로 만들 파일:
  - src/app/calendar/page.tsx
  - src/components/calendar/CalendarView.tsx
  - src/components/calendar/EventDialog.tsx
  - src/app/api/calendar/route.ts
  - src/app/api/calendar/[id]/route.ts

- 수정할 파일:
  - 없음 (새 파일만 생성)

[금지 사항]
- src/app/providers.tsx 수정 금지
- src/lib/db/rds-client.ts 수정 금지
- src/lib/auth/* 수정 금지
- 위 파일 수정이 필요하면 "어떤 코드를 추가해야 하는지"만 알려줘

[완료 조건]
1. npm run build 성공 확인하고 결과 보여줘
2. 수정/생성한 파일 목록 알려줘
3. 새로 설치한 npm 패키지 있으면 알려줘
4. 추가로 다른 파일에 넣어야 할 코드가 있으면 알려줘
```

---

## 2. 수정 금지 파일 목록 (공유 파일)

아래 파일들은 여러 기능에서 공통으로 사용됩니다. 한 AI가 마음대로 수정하면 다른 기능이 깨질 수 있습니다.

### 핵심 설정 파일
| 파일 | 역할 | 수정 시 영향 |
|------|------|-------------|
| `src/app/providers.tsx` | 앱 전체 설정 (테마, 인증, 날짜 등) | 전체 앱 에러 |
| `src/app/layout.tsx` | 페이지 기본 구조 | 전체 레이아웃 깨짐 |
| `src/lib/db/rds-client.ts` | 데이터베이스 연결 | 모든 DB 기능 에러 |
| `src/lib/auth/auth-options.ts` | 로그인 설정 | 로그인 불가 |
| `src/lib/auth/hooks.ts` | 로그인 상태 관리 | 로그인 관련 전체 에러 |
| `package.json` | 패키지 목록 | 빌드 실패 가능 |
| `next.config.js` | Next.js 설정 | 빌드/실행 실패 |

### 공유 컴포넌트
| 파일 | 역할 | 사용처 |
|------|------|--------|
| `src/components/AppHeader.tsx` | 상단 네비게이션 | 모든 페이지 |
| `src/components/AuthGuard.tsx` | 로그인 확인 | 로그인 필요 페이지들 |
| `src/components/FeedSidebar.tsx` | 사이드바 | 피드, 게시판 등 |

---

## 3. 작업별 가이드

### 새 페이지 추가
```
[요청 예시]
새 페이지 "/mypage" 만들어줘.

[작업 범위]
- 새로 만들 파일: src/app/mypage/page.tsx
- 수정할 파일: 없음

[금지]
- providers.tsx, layout.tsx 수정 금지
- 기존 컴포넌트 수정 금지 (새로 만들거나 그대로 사용)

[완료 조건]
- npm run build 성공
- 브라우저에서 /mypage 접속 확인
```

### 새 API 추가
```
[요청 예시]
사용자 통계 API 만들어줘. GET /api/user/stats

[작업 범위]
- 새로 만들 파일: src/app/api/user/stats/route.ts
- 수정할 파일: 없음

[금지]
- rds-client.ts 수정 금지
- 기존 API 파일 수정 금지

[완료 조건]
- npm run build 성공
- curl로 API 호출 테스트 결과 보여줘
```

### 기존 페이지 수정
```
[요청 예시]
대시보드 페이지에 "최근 활동" 섹션 추가해줘.

[작업 범위]
- 수정할 파일: src/app/dashboard/page.tsx
- 새로 만들 파일: src/components/dashboard/RecentActivity.tsx (필요시)

[금지]
- providers.tsx 수정 금지
- AuthGuard.tsx 수정 금지
- hooks.ts 수정 금지

[완료 조건]
- npm run build 성공
- 대시보드 페이지 스크린샷 또는 확인 방법 알려줘
```

### 새 패키지 설치가 필요한 작업
```
[요청 예시]
차트 기능 추가해줘.

[작업 범위]
- 새로 만들 파일: src/components/charts/BarChart.tsx
- 설치할 패키지: (AI가 결정)

[금지]
- providers.tsx 직접 수정 금지
- 패키지 설치 후 providers.tsx에 추가할 코드가 있으면 별도로 알려줘

[완료 조건]
- npm run build 성공
- 설치한 패키지 이름과 버전 알려줘
- providers.tsx에 추가할 코드 있으면 알려줘 (직접 수정 X)
```

---

## 4. 여러 AI 동시 작업 시

### 작업 분배 예시
```
=== Claude 담당 ===
[작업] Dashboard 프로필 동기화
[범위]
- src/app/dashboard/page.tsx
- src/app/api/user/profile/route.ts
- src/lib/auth/hooks.ts (예외적 수정 허용)
[금지] providers.tsx, rds-client.ts

=== Codex 담당 ===
[작업] 강의 시스템
[범위]
- src/app/board/lectures/*
- src/app/api/lectures/*
- migrations/013_*.sql
[금지] providers.tsx, rds-client.ts, auth 관련 파일

=== Gemini 담당 ===
[작업] 캘린더 기능
[범위]
- src/app/calendar/*
- src/components/calendar/*
- src/app/api/calendar/*
[금지] providers.tsx, rds-client.ts, auth 관련 파일
```

### 통합 단계
모든 AI 작업 완료 후:
1. Claude에게 "세 작업 통합해줘" 요청
2. Claude가 충돌 확인 및 해결
3. providers.tsx 등 공유 파일에 필요한 코드 통합
4. 최종 npm run build 확인

---

## 5. 문제 발생 시 체크리스트

### 빌드 에러
```
Q: npm run build 실패

확인 사항:
1. 새로 추가한 import가 실제로 존재하는가?
   - 예: @mui/x-date-pickers/AdapterDateFnsV3 (X)
   - 예: @mui/x-date-pickers/AdapterDateFns (O)

2. 패키지 설치했는가?
   - npm install 실행

3. 타입 에러가 있는가?
   - 에러 메시지 확인
```

### 런타임 에러
```
Q: 페이지 로딩 시 에러

확인 사항:
1. 콘솔 에러 메시지 확인
2. 서버 로그 확인 (터미널)
3. DB 테이블/컬럼 존재 확인
```

### 스타일 깨짐
```
Q: UI가 이상하게 보임

확인 사항:
1. MUI 버전 호환성 (v6 vs v7 문법 차이)
2. Grid size prop 문법
   - 예: xs={12} (구버전)
   - 예: size={{ xs: 12 }} (신버전)
```

---

## 6. 자주 발생하는 실수

### 1. 존재하지 않는 import 경로
```typescript
// 잘못된 예
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';

// 올바른 예
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
```

**방지법**: 새 패키지 사용 시 공식 문서에서 import 경로 확인

### 2. DB 스키마와 맞지 않는 쿼리
```typescript
// 잘못된 예 - status 컬럼이 없는데 조회
.select('id, role, status')

// 올바른 예 - 실제 존재하는 컬럼만
.select('id, role, is_active')
```

**방지법**: DB 테이블 스키마 먼저 확인

### 3. PostgreSQL 문법 오류
```typescript
// 잘못된 예 - SET 문에 파라미터 사용
await client.query('SET LOCAL var = $1', [value]);

// 올바른 예 - 문자열 직접 삽입
await client.query(`SET LOCAL var = '${escapedValue}'`);
```

**방지법**: PostgreSQL 특수 문법 확인

### 4. MUI 버전별 문법 차이
```tsx
// MUI v6 이전
<Grid xs={12} md={6}>

// MUI v7
<Grid size={{ xs: 12, md: 6 }}>
```

**방지법**: 현재 프로젝트 MUI 버전 확인 (package.json)

---

## 7. 빠른 참조

### 현재 프로젝트 정보
- Next.js: 15.x
- MUI: v7
- 인증: AWS Cognito + NextAuth
- DB: PostgreSQL (로컬) / AWS RDS (프로덕션)

### 주요 명령어
```bash
# 개발 서버
npm run dev

# 빌드 테스트
npm run build

# 포트 확인
lsof -ti:3000

# 프로세스 종료
lsof -ti:3000 | xargs kill -9
```

### 중요 파일 위치
```
src/
├── app/
│   ├── providers.tsx      # [공유] 앱 설정
│   ├── layout.tsx         # [공유] 레이아웃
│   └── api/               # API 라우트
├── components/
│   ├── AppHeader.tsx      # [공유] 헤더
│   └── AuthGuard.tsx      # [공유] 인증 가드
└── lib/
    ├── auth/
    │   ├── auth-options.ts # [공유] 인증 설정
    │   └── hooks.ts        # [공유] 인증 훅
    └── db/
        └── rds-client.ts   # [공유] DB 클라이언트
```
