# AIedulog 개발 체크리스트 - 완전판

## 🎯 Phase 1: 프로젝트 초기 설정 (1-2주)

### 1.1 개발 환경 구축
- [ ] **Next.js 14+ TypeScript 프로젝트 생성**
  ```bash
  npx create-next-app@latest aiedulog --typescript --tailwind --eslint --app
  ```
- [ ] **필수 패키지 설치**
  ```bash
  # 인증
  npm install next-auth @auth/drizzle-adapter
  
  # 데이터베이스 (Drizzle)
  npm install drizzle-orm postgres
  npm install -D drizzle-kit
  npm install @types/bcryptjs bcryptjs
  
  # Material 3 UI 라이브러리
  npm install @mui/material @mui/material-nextjs @emotion/react @emotion/styled
  npm install @mui/icons-material @mui/lab
  npm install react-hook-form @hookform/resolvers zod
  
  # Tailwind CSS Material 3 플러그인
  npm install -D @material-tailwind/react
  npm install -D tailwindcss-animate
  
  # 파일 업로드
  npm install aws-sdk multer
  npm install @types/multer
  
  # 기타 유틸리티
  npm install date-fns clsx
  npm install react-hot-toast
  ```
- [ ] **환경변수 설정 (.env.local)**
  ```env
  DATABASE_URL="postgresql://..."
  NEXTAUTH_SECRET="your-secret-here"
  NEXTAUTH_URL="http://localhost:3000"
  
  # OAuth 설정
  GOOGLE_CLIENT_ID=""
  GOOGLE_CLIENT_SECRET=""
  APPLE_ID=""
  APPLE_SECRET=""
  
  # AWS S3 설정
  AWS_ACCESS_KEY_ID=""
  AWS_SECRET_ACCESS_KEY=""
  AWS_REGION=""
  S3_BUCKET_NAME=""
  
  # Google Calendar API
  GOOGLE_CALENDAR_API_KEY=""
  ```

### 1.2 Material 3 디자인 시스템 구축
- [ ] **Material 3 컬러 시스템 구현 (tailwind.config.js)**
  ```javascript
  // Material 3 Dynamic Color Scheme
  colors: {
    // Primary colors
    primary: {
      DEFAULT: '#006493',      // Primary key color
      container: '#C8E6FF',    // Primary container
      onContainer: '#001E30',  // On primary container
    },
    // Secondary colors  
    secondary: {
      DEFAULT: '#50606E',      // Secondary key color
      container: '#D3E5F5',    // Secondary container
      onContainer: '#0C1D2A',  // On secondary container
    },
    // Tertiary colors
    tertiary: {
      DEFAULT: '#65597B',      // Tertiary key color
      container: '#ECDCFF',    // Tertiary container
      onContainer: '#201634',  // On tertiary container
    },
    // Error colors
    error: {
      DEFAULT: '#BA1A1A',      // Error
      container: '#FFDAD6',    // Error container
      onContainer: '#410002',  // On error container
    },
    // Surface colors
    surface: {
      DEFAULT: '#F8FAFA',      // Surface
      variant: '#DEE3E9',      // Surface variant
      tint: '#006493',         // Surface tint
    },
    // Background
    background: '#F8FAFA',
    // Outline
    outline: '#6F797F',
    outlineVariant: '#BFC8CE',
  }
  ```
- [ ] **Material 3 Typography 설정**
  - Display: 57/64 (Large), 45/52 (Medium), 36/44 (Small)
  - Headline: 32/40 (Large), 28/36 (Medium), 24/32 (Small)
  - Title: 22/28 (Large), 16/24 (Medium), 14/20 (Small)
  - Body: 16/24 (Large), 14/20 (Medium), 12/16 (Small)
  - Label: 14/20 (Large), 12/16 (Medium), 11/16 (Small)
  - 폰트: Roboto (영문), Noto Sans KR (한글)
- [ ] **Material 3 Elevation 시스템**
  ```css
  /* Material 3 Elevation Levels */
  .elevation-0: none
  .elevation-1: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)
  .elevation-2: 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)
  .elevation-3: 0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)
  .elevation-4: 0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.3)
  .elevation-5: 0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3)
  ```
- [ ] **Material 3 Shape 시스템**
  ```css
  /* Rounded corner radius */
  .shape-none: 0
  .shape-extra-small: 4px
  .shape-small: 8px
  .shape-medium: 12px
  .shape-large: 16px
  .shape-extra-large: 28px
  .shape-full: 9999px
  ```
- [ ] **Material 3 Motion 시스템**
  ```css
  /* Easing tokens */
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-decelerate: cubic-bezier(0, 0, 0, 1);
  --md-sys-motion-easing-accelerate: cubic-bezier(0.3, 0, 1, 1);
  --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  
  /* Duration tokens */
  --md-sys-motion-duration-short1: 50ms;
  --md-sys-motion-duration-short2: 100ms;
  --md-sys-motion-duration-short3: 150ms;
  --md-sys-motion-duration-short4: 200ms;
  --md-sys-motion-duration-medium1: 250ms;
  --md-sys-motion-duration-medium2: 300ms;
  --md-sys-motion-duration-medium3: 350ms;
  --md-sys-motion-duration-medium4: 400ms;
  --md-sys-motion-duration-long1: 450ms;
  --md-sys-motion-duration-long2: 500ms;
  --md-sys-motion-duration-long3: 550ms;
  --md-sys-motion-duration-long4: 600ms;
  ```
- [ ] **Material 3 Icons 설정**
  - Material Symbols (Variable Font) 사용
  - Outlined, Rounded, Sharp 스타일 중 Rounded 선택
  - 아이콘 크기: 20dp(small), 24dp(medium), 40dp(large)
- [ ] **로고 및 브랜딩 에셋**
  - Adaptive Icon (Android 13+ 스타일)
  - Dynamic Color 지원 로고 변형
  - 파비콘 세트 (Material You 스타일)
- [ ] **Material 3 컴포넌트 라이브러리 구축**
  - **Actions**: FAB, ExtendedFAB, IconButton, Button (Filled, Outlined, Text, Elevated, Tonal)
  - **Communication**: Badges, ProgressIndicator (Linear, Circular), Snackbar
  - **Containment**: BottomSheet, Card (Filled, Elevated, Outlined), Carousel, Dialog, Divider, Lists, Tabs
  - **Navigation**: BottomAppBar, NavigationBar, NavigationDrawer, NavigationRail, TopAppBar (Center, Small, Medium, Large)
  - **Selection**: Checkbox, Chips (Assist, Filter, Input, Suggestion), DatePicker, Menu, RadioButton, Slider, Switch, TimePicker
  - **Text inputs**: TextField (Filled, Outlined)

## 🏗️ Phase 2: 데이터베이스 및 인증 시스템 (2-3주)

### 2.1 데이터베이스 스키마 설계
- [ ] **Drizzle 스키마 설정 (src/db/schema.ts)**
  ```typescript
  import { pgTable, text, integer, boolean, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core'
  import { relations } from 'drizzle-orm'

  // Enums
  export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'BOARD_ADMIN', 'USER', 'RESTRICTED_USER'])
  export const pointTypeEnum = pgEnum('point_type', ['EARNED', 'SPENT', 'ADMIN_ADJUST'])
  export const applicationStatusEnum = pgEnum('application_status', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
  
  // 사용자 테이블
  export const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    image: text('image'),
    role: userRoleEnum('role').default('USER'),
    points: integer('points').default(0),
    isActive: boolean('is_active').default(true),
    canComment: boolean('can_comment').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 게시판 테이블
  export const boards = pgTable('boards', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    icon: text('icon'),
    order: integer('order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 게시판 권한 테이블 (별도 관리)
  export const boardPermissions = pgTable('board_permissions', {
    id: text('id').primaryKey(),
    boardId: text('board_id').notNull().references(() => boards.id),
    role: userRoleEnum('role').notNull(),
    canRead: boolean('can_read').default(true),
    canWrite: boolean('can_write').default(false),
    canComment: boolean('can_comment').default(false),
  })
  
  // 게시글 테이블
  export const posts = pgTable('posts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    excerpt: text('excerpt'),
    slug: text('slug').notNull().unique(),
    isPublished: boolean('is_published').default(false),
    isPinned: boolean('is_pinned').default(false),
    viewCount: integer('view_count').default(0),
    likeCount: integer('like_count').default(0), // 좋아요만 지원
    authorId: text('author_id').notNull().references(() => users.id),
    boardId: text('board_id').notNull().references(() => boards.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 댓글 테이블
  export const comments = pgTable('comments', {
    id: text('id').primaryKey(),
    content: text('content').notNull(),
    likeCount: integer('like_count').default(0), // 좋아요만 지원
    authorId: text('author_id').notNull().references(() => users.id),
    postId: text('post_id').notNull().references(() => posts.id),
    parentId: text('parent_id').references(() => comments.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 포인트 내역
  export const pointHistory = pgTable('point_history', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    points: integer('points').notNull(),
    type: pointTypeEnum('type').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // 파일 첨부 (다양한 확장자 지원)
  export const files = pgTable('files', {
    id: text('id').primaryKey(),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    fileExtension: text('file_extension').notNull(), // jpg, png, pdf, pptx, xlsx, hwp, doc, txt, md
    postId: text('post_id').references(() => posts.id),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // 일정 관리
  export const events = pgTable('events', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    location: text('location'),
    googleEventId: text('google_event_id'),
    postId: text('post_id').references(() => posts.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 강의 시스템 (강의 홍보 게시글 기반)
  export const lectures = pgTable('lectures', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    maxStudents: integer('max_students'),
    currentStudents: integer('current_students').default(0),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    price: decimal('price'),
    showApplicants: boolean('show_applicants').default(true), // 신청자 공개 여부
    postId: text('post_id').notNull().unique().references(() => posts.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 강의 신청
  export const lectureApplications = pgTable('lecture_applications', {
    id: text('id').primaryKey(),
    status: applicationStatusEnum('status').default('PENDING'),
    message: text('message'),
    userId: text('user_id').notNull().references(() => users.id),
    lectureId: text('lecture_id').notNull().references(() => lectures.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // 좋아요 테이블 (게시글/댓글)
  export const likes = pgTable('likes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    postId: text('post_id').references(() => posts.id),
    commentId: text('comment_id').references(() => comments.id),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // Contact 문의
  export const contacts = pgTable('contacts', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // 전남에듀테크교육연구회 통계 (관리자만 수정 가능)
  export const statistics = pgTable('statistics', {
    id: text('id').primaryKey(),
    memberCount: integer('member_count').default(0),    // 회원수
    lectureCount: integer('lecture_count').default(0),  // 강의 수
    teacherCount: integer('teacher_count').default(0),  // 수혜 교사 수
    schoolCount: integer('school_count').default(0),    // 수혜 학교 수
    updatedAt: timestamp('updated_at').defaultNow(),
  })

  // Relations
  export const usersRelations = relations(users, ({ many }) => ({
    posts: many(posts),
    comments: many(comments),
    pointHistory: many(pointHistory),
    applications: many(lectureApplications),
    likes: many(likes),
  }))

  export const postsRelations = relations(posts, ({ one, many }) => ({
    author: one(users, { fields: [posts.authorId], references: [users.id] }),
    board: one(boards, { fields: [posts.boardId], references: [boards.id] }),
    comments: many(comments),
    files: many(files),
    events: many(events),
    lecture: one(lectures),
    likes: many(likes),
  }))

  export const lecturesRelations = relations(lectures, ({ one, many }) => ({
    post: one(posts, { fields: [lectures.postId], references: [posts.id] }),
    applications: many(lectureApplications),
  }))
  ```

- [ ] **Drizzle 설정 파일 (drizzle.config.ts)**
  ```typescript
  import type { Config } from 'drizzle-kit'
  
  export default {
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    driver: 'pg',
    dbCredentials: {
      connectionString: process.env.DATABASE_URL!,
    },
  } satisfies Config
  ```

- [ ] **데이터베이스 연결 설정 (src/db/index.ts)**
  ```typescript
  import { drizzle } from 'drizzle-orm/postgres-js'
  import postgres from 'postgres'
  import * as schema from './schema'
  
  const connectionString = process.env.DATABASE_URL!
  const client = postgres(connectionString)
  export const db = drizzle(client, { schema })
  ```

- [ ] **마이그레이션 실행**
  ```bash
  npx drizzle-kit generate:pg
  npx drizzle-kit push:pg
  ```

### 2.2 인증 시스템 구축
- [ ] **NextAuth.js 설정 (app/api/auth/[...nextauth]/route.ts)**
  - Google OAuth 설정
  - Apple OAuth 설정
  - Drizzle 어댑터 설정
  - 커스텀 로그인 페이지
  - 사용자 역할 관리

- [ ] **미들웨어 설정 (middleware.ts)**
  - 보호된 라우트 설정
  - 권한별 접근 제어

## 🎨 Phase 3: Material 3 프론트엔드 구조 (2-3주)

### 3.1 Material 3 레이아웃 및 네비게이션
- [ ] **루트 레이아웃 (app/layout.tsx)**
  - Material 3 Theme Provider 설정
  - Dynamic Color 적용
  - 다크/라이트 모드 지원
  - 폰트 최적화 (Roboto, Noto Sans KR)
  - SessionProvider 설정

- [ ] **Material 3 Top App Bar**
  - Center-aligned (기본)
  - Small, Medium, Large 변형 지원
  - Scroll behavior (Elevate, Enter always, Snap)
  - Leading/Trailing icons
  - Headline text

- [ ] **Material 3 Navigation Drawer**
  - Modal drawer (모바일)
  - Standard drawer (데스크톱)
  - Navigation items with icons
  - Active state indicators
  - Dividers between sections

- [ ] **Material 3 Navigation Bar (하단)**
  - 3-5개 destinations
  - Active state with indicators
  - Badge support
  - FAB integration

- [ ] **Material 3 Navigation Rail (태블릿)**
  - Vertical navigation
  - Label visibility options
  - FAB integration
  - Grouped destinations

### 3.2 Material 3 랜딩페이지 (전남에듀테크교육연구회 중심)
- [ ] **Material 3 Hero Section**
  - Large Display Typography (57/64)
  - Dynamic Color background
  - Elevated Card 컨테이너
  - Material Motion transitions
  - FAB 및 Extended FAB CTA
  - Material Symbols 아이콘 활용

- [ ] **Material 3 Statistics Cards**
  - Outlined Card 레이아웃
  - Large Title Typography
  - Animated Number Counter
  - Material Icons 활용
  - Surface Variant 배경
  - Elevation 변화 호버 효과

- [ ] **Material 3 Feature Cards**
  - Filled/Elevated Card 변형
  - Material Symbols 아이콘
  - Headline Medium Typography
  - Body Large for descriptions
  - Container colors 활용
  - Ripple effect interactions

- [ ] **Material 3 Data Table**
  - Surface container
  - Divider lines
  - Sortable columns
  - Row hover states
  - Icon buttons for actions
  - Tonal Button "더 보기"

- [ ] **Material 3 Contact Form**
  - Outlined TextField 컴포넌트
  - Floating labels
  - Helper text
  - Error states
  - Character counter
  - Filled Button submit
  - Surface container card

- [ ] **사이트맵 푸터**
  - 다단 레이아웃 (3-4개 열)
  - 소분류별 메뉴 세로 나열
  - 소셜미디어 링크
  - 저작권 정보

## 📝 Phase 4: 게시판 시스템 (3-4주)

### 4.1 Material 3 게시판 기능
- [ ] **Material 3 게시글 작성 인터페이스**
  - Full-screen Dialog 에디터
  - Top App Bar with actions
  - Outlined TextField for title
  - Rich text editor with Material styling
  - Filled Select for board selection
  - Chip input for tags
  - Material 3 File Upload:
    * Drag & drop zone
    * Progress indicators
    * File type chips
    * Delete icon buttons
  - Date/Time Pickers (Material)
  - FAB for save/publish
  - Snackbar notifications

- [ ] **Material 3 FAB 배치**
  - Extended FAB "글쓰기" (Surface level)
  - Bottom-right position (기본)
  - Primary container color
  - Material Symbols edit icon
  - Disabled state styling

- [ ] **Material 3 Board Grid**
  - Elevated Cards grid layout
  - Image or icon headers
  - Headline/Supporting text
  - Outlined icon buttons
  - Search bar (Outlined TextField)

- [ ] **Material 3 Post List**
  - List with dividers
  - Three-line list items
  - Leading images/avatars
  - Trailing metadata
  - Filter Chips bar
  - Segmented Button sorting
  - Pagination component
  - Pinned badge indicator

- [ ] **Material 3 Post Detail**
  - Article container (Surface)
  - Display Small title
  - Body Large content
  - Attachment cards
  - Icon Button actions:
    * Favorite (toggle)
    * Share
    * Bookmark
  - Chip metadata display
  - Bottom App Bar (mobile)

### 4.2 Material 3 댓글 시스템
- [ ] **Material 3 Comment Components**
  - Outlined TextField for input
  - List with indentation (replies)
  - Avatar leading icons
  - Icon buttons (like, reply, report)
  - Time chips
  - More menu (vertical dots)
  - Expandable threads

- [ ] **댓글 API**
  - CRUD 작업
  - 권한 확인 (RESTRICTED_USER 댓글 금지)
  - 스팸 방지

### 4.3 파일 업로드 시스템
- [ ] **다양한 파일 형식 지원**
  - 이미지: jpg, png, gif, webp
  - 문서: pdf, doc, docx, pptx, xlsx, hwp
  - 텍스트: txt, md
  - AWS S3 연동
  - 파일 형식별 아이콘 표시

- [ ] **업로드 인터페이스**
  - 드래그 앤 드롭
  - 다중 파일 선택
  - 진행률 표시
  - 파일 크기 제한 (100MB)

- [ ] **파일 관리**
  - 파일 목록 미리보기
  - 개별 삭제 기능
  - 용량 제한 체크

## 🎓 Phase 5: 강의 시스템 (2-3주)

### 5.1 Material 3 강의 관리
- [ ] **Material 3 Course Registration**
  - Bottom Sheet for course details
  - Stepper component for setup
  - Number input (Outlined)
  - Date/Time Range Picker
  - Radio buttons for pricing
  - Switch for visibility settings
  - Filled Button "등록"

- [ ] **강의 홍보 페이지**
  - 강의 게시글 + 강의 정보 통합 표시
  - 강의 상세 정보 (정원, 일정, 가격 등)
  - 신청 버튼 (게시글 하단)
  - 신청 현황 표시

### 5.2 Material 3 신청 시스템
- [ ] **Material 3 Application Flow**
  - Extended FAB "강의 신청"
  - Full-screen Dialog form
  - Outlined TextFields
  - Checkbox agreements
  - Linear Progress indicator
  - Snackbar confirmations

- [ ] **신청자 관리 (강의 작성자)**
  - 신청자 목록 페이지
  - 승인/거부 기능
  - 신청자 공개 설정에 따른 표시:
    * 공개: 신청자 이름, 신청일 표시
    * 비공개: 신청 수만 표시
  - 신청자에게 승인/거부 알림

- [ ] **관리자 강의 관리**
  - 모든 강의 목록 조회
  - 강의별 신청 현황 확인
  - 문제 발생 시 개입 가능

## 📅 Phase 6: 일정 관리 및 구글 캘린더 연동 (1-2주)

### 6.1 Material 3 Calendar
- [ ] **Material 3 Event Creation**
  - Date Picker (Material)
  - Time Picker (Material)
  - Filled Select (repeat)
  - Chips for reminders
  - Color selection (Dynamic)

- [ ] **Material 3 Calendar View**
  - Segmented Button (view mode)
  - Card-based events
  - FAB for new event
  - Swipe gestures
  - Color-coded chips

### 6.2 구글 캘린더 연동
- [ ] **Google Calendar API 설정**
  - OAuth 2.0 인증
  - 캘린더 읽기/쓰기 권한

- [ ] **동기화 기능**
  - 양방향 동기화
  - 충돌 해결
  - 자동 동기화 설정

## 🏆 Phase 7: 포인트 시스템 (1-2주)

### 7.1 Material 3 포인트 시스템
- [ ] **Points Display Components**
  - Badge with point count
  - Circular Progress indicator
  - Animation on point change
  - Material Icons for actions

- [ ] **Points Shop Interface**
  - Grid of Elevated Cards
  - Icon and price display
  - Tonal Button purchase
  - Dialog confirmation
  - Success Snackbar

### 7.2 포인트 관리
- [ ] **포인트 내역 페이지**
  - 획득/사용 내역
  - 필터링 및 검색

- [ ] **관리자 포인트 조정**
  - 수동 포인트 지급/차감
  - 대량 포인트 관리

## 👥 Phase 8: 사용자 관리 시스템 (2-3주)

### 8.1 Material 3 Profile
- [ ] **Material 3 Profile Page**
  - Large avatar with edit FAB
  - Outlined TextFields for info
  - Tab navigation (activity)
  - List-based history

- [ ] **Material 3 Settings**
  - List with switches
  - Radio button groups
  - Segmented Button (theme)
  - Dropdown menus (language)
  - Dividers between sections

### 8.2 권한 관리
- [ ] **역할별 권한 정의**
  - 사이트 관리자 권한
  - 게시판 관리자 권한
  - 일반 사용자 권한
  - 제한 사용자 처리

- [ ] **권한 확인 미들웨어**
  - API 레벨 권한 검사
  - 컴포넌트 레벨 권한 검사

## 🛠️ Phase 9: 관리자 대시보드 (2-3주)

### 9.1 Material 3 Admin Dashboard
- [ ] **Material 3 Dashboard**
  - Grid of metric cards
  - Charts with Material colors
  - Data tables
  - Navigation Rail (desktop)
  - Top App Bar with menu

- [ ] **사용자 관리**
  - 사용자 목록
  - 권한 변경
  - 계정 활성화/비활성화

- [ ] **게시판 관리**
  - 게시판 생성/수정/삭제
  - 게시판 권한 설정
  - 게시글 관리

- [ ] **댓글 관리**
  - 댓글 목록
  - 댓글 삭제/숨김
  - 신고 댓글 처리

### 9.2 시스템 설정
- [ ] **사이트 설정**
  - 기본 정보 수정
  - SEO 설정
  - 소셜미디어 링크

- [ ] **전남에듀테크교육연구회 통계 관리**
  - 회원 수, 강의 수, 수혜 교사 수, 수혜 학교 수 수정
  - 랜딩페이지 통계 섹션 실시간 반영

- [ ] **Contact 문의 관리**
  - 문의 목록 조회
  - 읽음/미읽음 상태 관리
  - 답변 기능 (이메일 연동)

- [ ] **포인트 설정**
  - 포인트 획득 규칙
  - 포인트 사용처 관리

## 📱 Phase 10: 반응형 및 모바일 최적화 (1-2주)

### 10.1 Material 3 Responsive Design
- [ ] **Material 3 Adaptive Layouts**
  - Compact (0-599dp): Bottom Navigation Bar
  - Medium (600-839dp): Navigation Rail
  - Expanded (840+dp): Navigation Drawer
  - Adaptive Typography scaling
  - Touch target minimum 48dp
  - Gesture navigation support

### 10.2 PWA 기능
- [ ] **서비스 워커**
  - 오프라인 지원
  - 푸시 알림

- [ ] **매니페스트 파일**
  - 앱 아이콘
  - 스플래시 화면

## 🚀 Phase 11: 배포 및 최적화 (1-2주)

### 11.1 AWS 배포 설정
- [ ] **EC2 또는 Vercel 배포**
  - 프로덕션 환경 설정
  - 환경변수 관리
  - HTTPS 설정

- [ ] **데이터베이스 설정**
  - AWS RDS PostgreSQL
  - 백업 설정
  - 모니터링

- [ ] **S3 및 CloudFront**
  - 정적 파일 CDN
  - 이미지 최적화

### 11.2 성능 최적화
- [ ] **코드 스플리팅**
  - 동적 임포트
  - 레이지 로딩

- [ ] **SEO 최적화**
  - 메타 태그
  - 사이트맵
  - 구조화된 데이터

- [ ] **모니터링 설정**
  - 에러 추적 (Sentry)
  - 성능 모니터링
  - 로그 관리

## 🔧 Phase 12: 추가 기능 및 개선 (진행형)

### 12.1 고급 기능
- [ ] **검색 시스템 고도화**
  - 전문 검색 (Elasticsearch)
  - 자동 완성
  - 검색 결과 하이라이트

- [ ] **알림 시스템**
  - 실시간 알림
  - 이메일 알림
  - 푸시 알림

- [ ] **AI 기능 통합**
  - 게시글 자동 태깅
  - 콘텐츠 추천
  - 스팸 필터링

### 12.2 분석 및 개선
- [ ] **Google Analytics 연동**
- [ ] **사용자 행동 분석**
- [ ] **A/B 테스트 시스템**
- [ ] **피드백 수집 시스템**

---

## 📋 개발 우선순위 추천

### 🚀 MVP (최소 기능 제품) - 먼저 구현할 것
1. **Phase 1-2**: 기본 설정 + 인증
2. **Phase 3**: 기본 레이아웃
3. **Phase 4**: 게시판 기본 기능
4. **Phase 8**: 기본 사용자 관리

### 📈 확장 기능 - 나중에 추가할 것
1. **Phase 5**: 강의 시스템
2. **Phase 6**: 구글 캘린더 연동
3. **Phase 7**: 포인트 시스템
4. **Phase 9**: 관리자 대시보드

이 체크리스트로 Claude Code와 함께 단계적으로 개발하시면 체계적으로 진행할 수 있을 거예요! 🎯