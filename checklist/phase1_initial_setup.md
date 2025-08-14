# Phase 1: 프로젝트 초기 설정 (1-2주)

## 1.1 개발 환경 구축

### Next.js 프로젝트 생성
```bash
npx create-next-app@latest aiedulog --typescript --tailwind --eslint --app
```

### 필수 패키지 설치
```bash
# 인증
npm install next-auth @auth/drizzle-adapter

# 데이터베이스 (Drizzle)
npm install drizzle-orm postgres
npm install -D drizzle-kit
npm install @types/bcryptjs bcryptjs

# UI 라이브러리 
npm install @headlessui/react @heroicons/react
npm install react-hook-form @hookform/resolvers zod

# Material Icons
npm install material-symbols

# 파일 업로드
npm install aws-sdk multer
npm install @types/multer

# 유틸리티
npm install date-fns clsx
npm install react-hot-toast
```

### 환경변수 설정 (.env.local)
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth 설정
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AWS S3 설정 (선택)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
S3_BUCKET_NAME=""
```

## 1.2 브랜딩 및 Material 3 디자인 시스템 적용

### Tailwind 설정 (tailwind.config.js)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // AIEDULOG 브랜드 컬러 (Material 3 스타일 적용)
        primary: {
          DEFAULT: '#4A90E2',      // AI·지식의 신뢰성
          container: '#D4E4F7',    // Primary container
          onContainer: '#004B8D',  // On primary container  
        },
        accent: {
          DEFAULT: '#F5A623',      // 창의·활력
          container: '#FFE4B8',    // Accent container
          onContainer: '#5C3E00',  // On accent container
        },
        dark: '#2C3E50',           // 글로벌·전문성
        light: '#EDEFF2',          // 깨끗함·가독성
        // Material 3 Surface colors
        surface: {
          DEFAULT: '#FAFAFC',
          variant: '#E0E2E6',
          tint: '#4A90E2',
        },
        background: '#FAFAFC',
        outline: '#73777F',
        error: '#BA1A1A',
      },
      borderRadius: {
        'sm': '8px',    // shape-small
        'md': '12px',   // shape-medium
        'lg': '16px',   // shape-large
        'xl': '28px',   // shape-extra-large
      },
      boxShadow: {
        'elevation-1': '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
        'elevation-2': '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
        'elevation-3': '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)',
      },
      fontFamily: {
        sans: ['Roboto', 'Noto Sans KR', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['57px', '64px'],
        'headline-lg': ['32px', '40px'],
        'title-lg': ['22px', '28px'],
        'body-lg': ['16px', '24px'],
        'label-lg': ['14px', '20px'],
      },
    },
  },
}
```

### 폰트 설정 (app/layout.tsx)
```typescript
import { Roboto } from 'next/font/google'
import { Noto_Sans_KR } from 'next/font/google'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
})

const notoSansKR = Noto_Sans_KR({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto',
})
```

### 기본 컴포넌트 스타일 가이드
- **Button**: Filled, Outlined, Text 스타일
- **Card**: Elevated (shadow), Outlined (border) 스타일
- **TextField**: Material 3 Outlined 스타일
- **최소 터치 타겟**: 48px (모바일 고려)

### 로고 및 파비콘
- [ ] SVG 로고 파일 제작
- [ ] 파비콘 세트 생성 (16x16, 32x32, 192x192, 512x512)
- [ ] 모바일 앱 아이콘 (180x180)

## ✅ 체크리스트

- [ ] Next.js 프로젝트 생성
- [ ] 패키지 설치
- [ ] 환경변수 파일 생성
- [ ] Tailwind 설정 (Material 3 토큰)
- [ ] 폰트 설정
- [ ] 기본 컴포넌트 라이브러리 구축
- [ ] 로고 및 파비콘 제작