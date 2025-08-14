# AIedulog 개발 체크리스트 가이드

## 📁 파일 구조
체크리스트를 Phase별로 분리하여 토큰 사용량을 최소화했습니다.

```
checklist/
├── README.md                    # 이 파일 (전체 가이드)
├── 00_required_accounts.md      # 필요한 외부 서비스 계정 목록
├── phase1_initial_setup.md      # 프로젝트 초기 설정
├── phase2_database_auth.md      # 데이터베이스 & 인증
├── phase3_frontend_layout.md    # 프론트엔드 레이아웃
├── phase4_board_system.md       # 게시판 시스템
├── phase5_lecture_system.md     # 강의 시스템
├── phase6_calendar.md           # 일정 관리
├── phase7_points.md             # 포인트 시스템
├── phase8_user_management.md    # 사용자 관리
├── phase9_admin.md              # 관리자 대시보드
├── phase10_responsive.md        # 반응형 디자인
└── phase11_deployment.md        # 배포 및 최적화
```

## 🚀 MVP 개발 순서 (권장)

### 1단계: 기초 설정 (1-2주)
1. **계정 생성** (`00_required_accounts.md`)
   - Supabase/Neon 데이터베이스
   - Google OAuth 설정
   
2. **프로젝트 초기화** (`phase1_initial_setup.md`)
   - Next.js 설정
   - Material 3 디자인 토큰 적용

### 2단계: 핵심 기능 (3-4주)
3. **인증 시스템** (`phase2_database_auth.md`)
   - 데이터베이스 스키마
   - NextAuth 구현

4. **기본 UI** (`phase3_frontend_layout.md`)
   - 레이아웃 구성
   - 랜딩페이지

5. **게시판** (`phase4_board_system.md`)
   - CRUD 기능
   - 댓글 시스템

### 3단계: 사용자 기능 (2-3주)
6. **사용자 관리** (`phase8_user_management.md`)
   - 프로필 관리
   - 권한 시스템

### 4단계: 확장 기능 (선택적)
7. **강의 시스템** (`phase5_lecture_system.md`)
8. **일정 관리** (`phase6_calendar.md`)
9. **포인트 시스템** (`phase7_points.md`)
10. **관리자 패널** (`phase9_admin.md`)

### 5단계: 마무리 (1주)
11. **반응형 최적화** (`phase10_responsive.md`)
12. **배포** (`phase11_deployment.md`)

## 💡 개발 팁

### 토큰 절약 방법
- 작업할 Phase의 파일만 참조
- 완료된 Phase는 닫아두기
- 공통 코드는 별도 파일로 관리

### Material 3 디자인 적용
- 컬러: Primary, Accent, Surface 시스템 사용
- 타이포그래피: Display, Headline, Title, Body 스케일
- Elevation: 0-5 레벨 그림자
- Shape: 8px, 12px, 16px, 28px 라운딩
- 터치 타겟: 최소 48px

### 우선순위
1. **필수**: Phase 1-4, 8
2. **권장**: Phase 5, 9
3. **선택**: Phase 6, 7, 10

## 🔗 빠른 시작

```bash
# 1. 프로젝트 생성
npx create-next-app@latest aiedulog --typescript --tailwind --eslint --app

# 2. 디렉토리 이동
cd aiedulog

# 3. Phase 1 체크리스트 확인
# checklist/phase1_initial_setup.md 참조

# 4. 패키지 설치 후 개발 시작
npm run dev
```

## 📌 중요 사항

- **데이터베이스**: 개발은 Supabase(무료), 프로덕션은 AWS RDS
- **인증**: Google OAuth 먼저, Apple은 나중에
- **파일 저장**: 초기에는 로컬, 나중에 S3 연동
- **배포**: Vercel로 시작, 트래픽 증가시 AWS 전환

## 🤝 도움이 필요하면

각 Phase 파일을 참조하면서 개발하시고, 
막히는 부분이 있으면 해당 Phase 파일과 함께 질문해주세요!