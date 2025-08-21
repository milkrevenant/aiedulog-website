'use client'

import { ReactNode } from 'react'
import { Box } from '@mui/material'

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {children}
    </Box>
  )
}