import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Providers } from './providers'
import ActivityTracker from '@/components/ActivityTracker'
import './globals.css'

const nunito = localFont({
  src: [
    { path: '../../public/fonts/Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTA3j6zbXWjgevT5.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2', weight: '400', style: 'normal' },
  ],
  variable: '--font-primary',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AIedulog - 전남에듀테크교육연구회',
  description: '전남에듀테크교육연구회 커뮤니티 플랫폼',
}

export const runtime = 'nodejs'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.EXCALIDRAW_ASSET_PATH = "/";`
          }}
        />
      </head>
      <body className={`${nunito.variable} antialiased`}>
        <Providers>
          <ActivityTracker />
          {children}
        </Providers>
      </body>
    </html>
  )
}
