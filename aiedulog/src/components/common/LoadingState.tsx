import { Box, Skeleton, Typography } from '@mui/material'

interface LoadingStateProps {
  message?: string
  height?: number | string
}

export function LoadingState({ message = 'Loading...', height = 200 }: LoadingStateProps) {
  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2, mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="60%" height={30} />
        <Skeleton variant="text" width="40%" />
      </Box>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          {message}
        </Typography>
      )}
    </Box>
  )
}
