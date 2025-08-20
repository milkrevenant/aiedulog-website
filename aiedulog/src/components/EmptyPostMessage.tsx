'use client'

import { Card, CardContent, Typography, Stack } from '@mui/material'
import { Create } from '@mui/icons-material'

interface EmptyPostMessageProps {
  message?: string
  subMessage?: string
}

export default function EmptyPostMessage({
  message = '아직 게시글이 없습니다',
  subMessage = '첫 번째 글을 작성해보세요!',
}: EmptyPostMessageProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent>
        <Stack spacing={1} alignItems="center" sx={{ py: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center">
            {message}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Create fontSize="small" />
            {subMessage}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
