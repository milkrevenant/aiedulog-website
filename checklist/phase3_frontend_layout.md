# Phase 3: 프론트엔드 기본 구조 (2-3주)

## 3.1 레이아웃 및 네비게이션

### 루트 레이아웃 (app/layout.tsx)
```typescript
import './globals.css'
import { Roboto, Noto_Sans_KR } from 'next/font/google'
import { SessionProvider } from '@/components/providers/SessionProvider'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${roboto.variable} ${notoSansKR.variable}`}>
      <body className="font-sans bg-background text-gray-900">
        <SessionProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
```

### 헤더 컴포넌트 구조
- 로고 (좌측)
- 메인 네비게이션 (중앙)
- 사용자 메뉴 (우측)
- 모바일 햄버거 메뉴
- Material 3 elevation 효과 (스크롤 시)

### 사이드바 (데스크탑 전용)
- 게시판 목록
- 사용자 정보 위젯
- 빠른 메뉴
- Material 3 Card 스타일

### 반응형 브레이크포인트
```css
/* 모바일: 0-768px */
/* 데스크탑: 769px+ */
/* 버튼 최소 크기: 48px (터치 친화적) */
```

## 3.2 랜딩페이지 구현

### 히어로 섹션
```typescript
<section className="bg-gradient-to-br from-primary to-primary-container">
  <div className="container mx-auto px-4 py-20">
    <h1 className="text-display-lg font-bold text-white">
      AIEDULOG
    </h1>
    <p className="text-headline-lg text-white/90 mt-4">
      전남에듀테크교육연구회
    </p>
    <div className="mt-8 space-x-4">
      <button className="px-8 py-4 bg-accent text-white rounded-lg shadow-elevation-2">
        시작하기
      </button>
      <button className="px-8 py-4 bg-white text-primary rounded-lg shadow-elevation-1">
        둘러보기
      </button>
    </div>
  </div>
</section>
```

### 통계 섹션 (전남에듀테크교육연구회)
```typescript
const stats = [
  { label: '회원 수', value: memberCount, icon: 'person' },
  { label: '총 강의', value: lectureCount, icon: 'school' },
  { label: '수혜 교사', value: teacherCount, icon: 'groups' },
  { label: '수혜 학교', value: schoolCount, icon: 'business' },
]

<section className="py-16 bg-surface">
  <div className="container mx-auto px-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div className="bg-white rounded-lg p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-shadow">
          <span className="material-symbols-rounded text-primary text-4xl">
            {stat.icon}
          </span>
          <div className="mt-4">
            <div className="text-3xl font-bold text-dark">
              {stat.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

### 추구하는 가치 섹션
- 4-6개 카드 그리드
- Material Icons 사용
- Elevated Card 스타일
- 호버 시 elevation 변화

### 최근 강의 테이블
- Material 3 Data Table 스타일
- 헤더 고정
- 행 호버 효과
- "더 보기" Tonal Button

### Contact 섹션
- Material 3 Outlined TextField
- Floating labels
- 유효성 검사 에러 표시
- Submit 버튼 (Filled style)

## ✅ 체크리스트

### 레이아웃
- [ ] 루트 레이아웃 구성
- [ ] 헤더 컴포넌트
- [ ] 푸터 컴포넌트
- [ ] 사이드바 (데스크탑)
- [ ] 모바일 메뉴
- [ ] 다크/라이트 모드 토글

### 랜딩페이지
- [ ] 히어로 섹션
- [ ] 통계 카드
- [ ] 가치 섹션
- [ ] 강의 테이블
- [ ] Contact 폼
- [ ] 반응형 테스트

### Material 3 스타일링
- [ ] 컴포넌트별 elevation 적용
- [ ] 터치 타겟 48px 확인
- [ ] 애니메이션 트랜지션
- [ ] 색상 시스템 검증