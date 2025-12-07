import { Box, Button, Card, Typography, alpha, useTheme } from '@mui/material'
import { ErrorOutline, Refresh } from '@mui/icons-material'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = '오류 발생', message, onRetry }: ErrorStateProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        width: '100%',
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          maxWidth: 400,
          border: '1px solid',
          borderColor: 'error.light',
          bgcolor: alpha(theme.palette.error.main, 0.05),
        }}
      >
        <ErrorOutline color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        {onRetry && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Refresh />}
            onClick={onRetry}
          >
            다시 시도
          </Button>
        )}
      </Card>
    </Box>
  )
}
