# Phase 2: 데이터베이스 및 인증 시스템 (2-3주)

## 2.1 데이터베이스 스키마 설계

### Drizzle 스키마 (src/db/schema.ts)
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
  likeCount: integer('like_count').default(0),
  authorId: text('author_id').notNull().references(() => users.id),
  boardId: text('board_id').notNull().references(() => boards.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// 댓글 테이블
export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  likeCount: integer('like_count').default(0),
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
```

### Drizzle 설정 (drizzle.config.ts)
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

### 데이터베이스 연결 (src/db/index.ts)
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

### 마이그레이션 실행
```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

## 2.2 NextAuth 인증 시스템

### NextAuth 설정 (app/api/auth/[...nextauth]/route.ts)
```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'

export const authOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 미들웨어 설정 (middleware.ts)
```typescript
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // 보호된 라우트 체크
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.role === 'ADMIN'
      }
      if (req.nextUrl.pathname.startsWith('/write')) {
        return !!token
      }
      return true
    },
  },
})

export const config = {
  matcher: ['/admin/:path*', '/write/:path*', '/profile/:path*'],
}
```

### 세션 타입 정의 (types/next-auth.d.ts)
```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
  
  interface User {
    role: string
  }
}
```

## ✅ 체크리스트

### 데이터베이스
- [ ] Supabase/Neon 계정 생성
- [ ] DATABASE_URL 환경변수 설정
- [ ] Drizzle 스키마 작성
- [ ] 마이그레이션 실행
- [ ] 데이터베이스 연결 테스트

### 인증
- [ ] Google Cloud Console OAuth 설정
- [ ] GOOGLE_CLIENT_ID, SECRET 환경변수 설정
- [ ] NextAuth 설정
- [ ] 로그인 페이지 구현
- [ ] 미들웨어 설정
- [ ] 세션 관리 테스트