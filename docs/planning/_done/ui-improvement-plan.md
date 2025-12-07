# UI/프론트엔드 개선 계획

## 개요

**목표**: Dashboard 및 주요 페이지 UI 개선
**담당**: Gemini
**충돌 주의**: `src/app/api/` 및 `src/lib/services/` 폴더는 Codex가 작업 중이므로 수정 금지

---

## 작업 범위

### 수정 가능한 폴더
```
src/app/(pages)/**        - 페이지 컴포넌트
src/components/**         - UI 컴포넌트 (admin 제외)
src/styles/**             - 스타일 파일
```

### 수정 금지 (Codex 작업 중)
```
src/app/api/**            - API 라우트
src/lib/services/**       - 서비스 로직
src/lib/security/**       - 보안 로직
src/lib/admin/**          - 관리자 서비스
```

---

## 작업 목록

### 1. Dashboard 개선 (`src/app/dashboard/page.tsx`)

**현재 상태**: 기본적인 프로필 정보만 표시

**개선 사항**:
- [ ] 환영 메시지 카드 추가 (사용자 이름 표시)
- [ ] 빠른 액션 버튼들 (캘린더, 게시판, 설정)
- [ ] 최근 활동 섹션
- [ ] 반응형 그리드 레이아웃

**참고 컴포넌트**:
```tsx
// MUI 사용
import { Card, CardContent, Grid, Typography, Button } from '@mui/material'
```

### 2. 캘린더 페이지 스타일링 (`src/app/calendar/page.tsx`)

**현재 상태**: 기본 캘린더 컴포넌트

**개선 사항**:
- [ ] 일정 카드 디자인 개선
- [ ] 색상 코드 (일정 유형별)
- [ ] 호버/클릭 인터랙션
- [ ] 모바일 뷰 최적화

### 3. 로딩/에러 상태 UI

**대상 파일**:
- `src/components/AuthGuard.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/calendar/page.tsx`

**개선 사항**:
- [ ] 스켈레톤 로딩 UI 추가
- [ ] 에러 메시지 카드 디자인
- [ ] 재시도 버튼
- [ ] 빈 상태(empty state) UI

**예시 코드**:
```tsx
// 스켈레톤 로딩
import { Skeleton, Box } from '@mui/material'

function LoadingSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
    </Box>
  )
}

// 에러 상태
function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card sx={{ p: 3, textAlign: 'center' }}>
      <Typography color="error" gutterBottom>{message}</Typography>
      <Button variant="outlined" onClick={onRetry}>다시 시도</Button>
    </Card>
  )
}
```

### 4. 반응형 레이아웃 개선

**대상**:
- 네비게이션 바
- 사이드바
- 카드 그리드

**브레이크포인트**:
```tsx
// MUI 기본 브레이크포인트
xs: 0px    // 모바일
sm: 600px  // 태블릿
md: 900px  // 소형 데스크탑
lg: 1200px // 대형 데스크탑
```

**개선 사항**:
- [ ] 모바일에서 사이드바 → 하단 네비게이션
- [ ] 카드 그리드 반응형 (xs=12, sm=6, md=4)
- [ ] 폰트 사이즈 반응형 조정

### 5. 공통 컴포넌트 정리

**생성할 컴포넌트** (`src/components/common/`):
- [ ] `PageHeader.tsx` - 페이지 제목 + 액션 버튼
- [ ] `LoadingState.tsx` - 로딩 UI
- [ ] `ErrorState.tsx` - 에러 UI
- [ ] `EmptyState.tsx` - 빈 상태 UI
- [ ] `ActionCard.tsx` - 클릭 가능한 카드

**예시**:
```tsx
// src/components/common/PageHeader.tsx
interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h4" fontWeight="bold">{title}</Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
  )
}
```

---

## 디자인 가이드

### 색상 팔레트
```tsx
// MUI 테마 색상 사용
primary: '#1976d2'    // 파란색 (주요 액션)
secondary: '#9c27b0'  // 보라색 (보조 액션)
success: '#2e7d32'    // 초록색 (성공)
warning: '#ed6c02'    // 주황색 (경고)
error: '#d32f2f'      // 빨간색 (에러)
```

### 간격 (Spacing)
```tsx
// MUI sx prop 사용
p: 2  // padding: 16px
m: 3  // margin: 24px
gap: 2 // gap: 16px
```

### 그림자
```tsx
// MUI elevation
elevation={0}  // 그림자 없음
elevation={1}  // 약한 그림자
elevation={3}  // 중간 그림자
elevation={6}  // 강한 그림자
```

---

## 작업 순서

1. **공통 컴포넌트 먼저** (재사용성)
   - LoadingState, ErrorState, EmptyState, PageHeader

2. **Dashboard 개선**
   - 레이아웃 구조
   - 카드 컴포넌트들

3. **캘린더 스타일링**
   - 일정 카드 디자인
   - 인터랙션

4. **반응형 테스트**
   - 모바일 뷰 확인
   - 태블릿 뷰 확인

---

## 완료 기준

- [ ] `npm run build` 성공
- [ ] 타입 에러 없음
- [ ] 모바일 반응형 동작 확인
- [ ] 로딩/에러 상태 UI 적용

---

## 참고 파일

### 현재 테마 설정
`src/app/providers.tsx` - MUI 테마 프로바이더

### 기존 컴포넌트 참고
- `src/components/Navbar.tsx`
- `src/components/board/` - 게시판 컴포넌트들

---

*작성일: 2025-12-07*
