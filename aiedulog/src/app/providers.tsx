'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { theme } from './theme/theme'
import { AuthProvider } from '@/lib/auth/context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
