import type { Metadata } from 'next'
import { Noto_Sans_KR, IBM_Plex_Sans_KR } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const notoSansKr = Noto_Sans_KR({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
})

const ibmPlexSansKr = IBM_Plex_Sans_KR({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ibm-plex',
})

export const metadata: Metadata = {
  title: 'AIedulog - 전남에듀테크교육연구회',
  description: '전남에듀테크교육연구회 커뮤니티 플랫폼',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${ibmPlexSansKr.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
