'use client'

import type { ReactNode } from 'react'
import { Box, Container, Typography } from '@mui/material'

type CMSContentProps = {
  sectionKey: string
  fallbackContent?: ReactNode
  containerProps?: Record<string, unknown>
}

export function CMSContent({
  sectionKey,
  fallbackContent,
  containerProps = {},
}: CMSContentProps) {
  if (fallbackContent) {
    return <>{fallbackContent}</>
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }} {...containerProps}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Content not available
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The section "{sectionKey}" does not have content configured.
        </Typography>
      </Box>
    </Container>
  )
}

export default CMSContent
