# 다음 세션 시작 체크리스트 (2025-08-23)

## ✅ 빠른 시작
```bash
cd aiedulog
npm install  # 패키지 업데이트 후 필수
npm run dev
# http://localhost:3000
```

## 🚀 배포 현황
- **AWS Amplify**: 배포 파이프라인 구축 완료 (Vercel 사용 안함)
- **GitHub Actions**: 자동 배포 설정됨
- **React 버전**: 18.3.1 (호환성 문제 해결)
- **도메인**: 가비아 도메인 연결됨
- **Node.js**: 20+ 업그레이드 필요 (AWS 요구사항)

## 📌 오늘 완료한 주요 작업 (2025-08-22)

### 1. 채팅 시스템 전면 개편
- ✅ Slack/Teams 스타일 인라인 협업 도구 통합
- ✅ Kanban 보드 (4 컬럼: Todo, In Progress, Review, Done)
- ✅ Excalidraw 화이트보드 통합
- ✅ 채팅 인터페이스 모든 버튼 기능 구현
- ✅ 세로 스크롤 문제 해결 (flex 레이아웃)

### 2. 데이터베이스 구조 개선
- ✅ RLS 무한 재귀 문제 근본적 해결
- ✅ chat_room type 제약 확장
- ✅ 외래 키 관계 재정립
- ✅ 테스트 페이지 구축 (/test-chat, /test-kanban)

### 3. AWS Amplify 빌드 문제 해결
- ✅ React 19 → 18.3.1 다운그레이드
- ✅ 모든 TypeScript 타입 이슈 해결
- ✅ Excalidraw 타입 import 문제 해결
- ✅ 빌드 성공 및 자동 배포 정상화

## 🚨 긴급 작업 (최우선)

### 1. Node.js 20+ 업그레이드 (AWS 요구사항)
```bash
# package.json engines 필드 추가
"engines": {
  "node": ">=20.0.0"
}
```
- AWS Amplify에서 Node.js 20 이상 요구
- amplify.yml 업데이트 필요

### 2. 파비콘 추가
- /public/favicon.ico 생성
- /public/icon.png (다양한 크기)
- /app/layout.tsx에 메타데이터 추가

## 🎯 내일 작업 계획 (2025-08-23)

### 1. 사용자 관리 기능 강화 (우선순위: 높음)

#### 관리자 회원 삭제 기능:
- [ ] /admin/users 페이지에 삭제 버튼 추가
- [ ] 삭제 확인 다이얼로그
- [ ] 관련 데이터 cascade 삭제 설정
- [ ] 삭제 로그 기록

#### 이메일 유효성 검사 강화:
```typescript
// 유효한 이메일 도메인 검사
const validDomains = [
  'gmail.com',
  'naver.com', 
  'daum.net',
  'kakao.com',
  'hanmail.net',
  // 교육기관 도메인 추가
]

// 일회용 이메일 차단
const blockedDomains = [
  'temp-mail.org',
  'guerrillamail.com',
  // 기타 일회용 이메일 서비스
]
```
- [ ] 실제 존재하는 이메일 도메인 검증
- [ ] MX 레코드 확인
- [ ] 일회용 이메일 서비스 차단
- [ ] 이메일 형식 정규식 강화

### 2. 패키지 업데이트 및 정리 (우선순위: 높음)
```bash
# 작업 순서
1. npm outdated  # 오래된 패키지 확인
2. npm audit  # 보안 취약점 확인
3. @supabase/auth-helpers-nextjs 제거
4. @supabase/ssr 설치 및 마이그레이션
5. npm audit fix  # 취약점 자동 수정
```

#### 제거할 패키지:
- `@supabase/auth-helpers-nextjs` (deprecated)
- `@auth/supabase-adapter` (사용 안함)
- `next-auth` (Supabase Auth 사용)

#### 업데이트 필요:
- `@supabase/ssr` 최신 버전으로 마이그레이션
- Material UI 관련 패키지 동기화

### 2. 강의 시스템 완성 (우선순위: 높음)

#### 강의 신청 기능:
- [ ] /lectures 공개 강의 목록 페이지
- [ ] /lectures/[id] 강의 상세 페이지
  - 강의 정보 (일정, 장소, 강사)
  - 커리큘럼 상세
  - 수강 후기
  - 관련 자료 다운로드
- [ ] 참가 신청 버튼 로직
  - 로그인 체크
  - 중복 신청 방지
  - 정원 초과 체크
  - 대기자 명단 관리
- [ ] 신청 확인 이메일 발송
- [ ] 신청 취소 기능

#### 일정 관리 달력:
- [ ] FullCalendar 라이브러리 통합
- [ ] 강의 일정 표시
- [ ] 월/주/일 뷰 전환
- [ ] 모바일 반응형 달력
- [ ] 일정 필터링 (카테고리별)
- [ ] 구글 캘린더 연동

### 3. Supabase 보안 및 성능 최적화 (우선순위: 높음)

#### 보안 이슈:
- [ ] RLS 정책 전면 검토
- [ ] API 키 권한 최소화
- [ ] SQL Injection 방지
- [ ] XSS 공격 방지
- [ ] Rate Limiting 설정
- [ ] 민감한 데이터 암호화

#### 성능 최적화:
- [ ] 인덱스 최적화
- [ ] 쿼리 성능 분석
- [ ] N+1 쿼리 문제 해결
- [ ] 캐싱 전략 구현
- [ ] 이미지 최적화 (Storage)
- [ ] 실시간 구독 최적화

### 4. 칸반보드 구체화 (우선순위: 중간)

#### 태스크 상세 기능:
- [ ] 태스크 클릭 시 상세 정보 모달
- [ ] 설명(description) 필드 추가
- [ ] 마크다운 에디터 통합
- [ ] 첨부파일 업로드 기능

#### 태스크 메타데이터:
- [ ] 라벨 시스템 (bug, feature, improvement)
- [ ] 우선순위 (긴급, 높음, 보통, 낮음)
- [ ] 마감일 설정 (date picker)
- [ ] 예상 소요시간 필드

#### 협업 기능:
- [ ] 담당자 할당 (사용자 선택)
- [ ] 멘션 기능 (@username)
- [ ] 태스크 댓글 시스템
- [ ] 활동 로그 (히스토리)

#### UI/UX 개선:
- [ ] 진행률 표시 (Progress bar)
- [ ] 필터링 기능 (담당자, 라벨, 우선순위)
- [ ] 검색 기능
- [ ] 드래그 앤 드롭 애니메이션 개선

### 3. 공감 시스템 개선 (우선순위: 중간)

#### 공감 게시글 컴포넌트:
```tsx
// 공감 타입 다양화
const reactionTypes = {
  like: { icon: '👍', label: '좋아요' },
  love: { icon: '❤️', label: '사랑해요' },
  clap: { icon: '👏', label: '응원해요' },
  celebrate: { icon: '🎉', label: '축하해요' },
  insight: { icon: '💡', label: '유익해요' }
}
```

- [ ] 공감 버튼 호버 시 타입 선택 팝업
- [ ] 애니메이션 효과 (confetti, bounce)
- [ ] 공감 수 실시간 업데이트
- [ ] 최근 공감한 사용자 아바타 표시

#### 공감 댓글 컴포넌트:
- [ ] 댓글별 공감 기능
- [ ] 공감한 사용자 목록 툴팁
- [ ] 베스트 댓글 하이라이트
- [ ] 공감 알림 설정

### 4. 코드 품질 개선 (우선순위: 낮음)

#### TypeScript 개선:
- [ ] interface 정의 파일 분리 (`/types` 폴더)
- [ ] any 타입 제거
- [ ] 제네릭 타입 활용

#### 성능 최적화:
- [ ] React.memo로 불필요한 리렌더링 방지
- [ ] useMemo/useCallback 적용
- [ ] 이미지 lazy loading
- [ ] 코드 스플리팅

#### 컴포넌트 리팩토링:
- [ ] 공통 컴포넌트 추출
- [ ] 커스텀 훅 생성
- [ ] 스토리북 도입 검토

## ⚠️ 주의사항

### React 18 호환성:
- React 19 사용 금지 (Excalidraw 등 라이브러리 호환성)
- @types/react, @types/react-dom 버전 18 유지

### 테스트 페이지:
- /test-chat, /test-kanban, /test-layout는 .gitignore에 포함됨
- 프로덕션 빌드에서 제외됨

### AWS Amplify:
- main 브랜치 푸시 시 자동 배포
- 빌드 실패 시 이메일 알림 확인

## 📚 참조 문서
- **진행 상황**: `/docs/PROGRESS.md`
- **할 일 목록**: `/docs/TODO.md`
- **AWS 배포 가이드**: `/AWS_DEPLOYMENT_GUIDE.md`
- **README 배포**: `/README_DEPLOYMENT.md`

## 💡 Quick Tips

### 포트 충돌 해결:
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows PowerShell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

### Git 작업:
```bash
# 상태 확인
git status

# 변경사항 스테이징
git add -A

# 커밋
git commit -m "feat: 기능 설명"

# 푸시 (AWS Amplify 자동 배포)
git push origin main
```

## 🔗 유용한 링크
- [Supabase Dashboard](https://supabase.com/dashboard/project/njnrezduzotxfombfanu)
- [GitHub Repo](https://github.com/milkrevenant/aiedulog-website)
- [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- [Material UI Docs](https://mui.com/material-ui/)

---
*업데이트: 2025-08-22 00:55*