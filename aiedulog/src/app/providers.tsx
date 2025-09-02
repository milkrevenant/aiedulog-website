'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { theme } from './theme/theme'
import { AuthProvider } from '@/lib/auth/context'
import { useEffect } from 'react'
import { initializeClientSecurity } from '@/lib/security/client-security'
import SchedulingNavigation from '@/components/SchedulingNavigation'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize client-side security on mount
    initializeClientSecurity({
      devToolsProtection: process.env.NODE_ENV === 'production',
      consoleOverride: process.env.NODE_ENV === 'production',
      debuggerProtection: process.env.NODE_ENV === 'production',
      rightClickProtection: false, // Keep disabled for UX
      textSelectionProtection: false, // Keep disabled for UX
      viewSourceProtection: true,
      localStorageEncryption: true,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      idleTimeout: 30 * 60 * 1000, // 30 minutes
    })
  }, [])

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          {children}
          <SchedulingNavigation />
        </AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
