import { Card, CardActionArea, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import { ReactNode } from 'react'

interface ActionCardProps {
  title: string
  description?: string
  icon?: ReactNode
  onClick?: () => void
  color?: string  // hex color like '#1976d2'
}

export function ActionCard({ title, description, icon, onClick, color }: ActionCardProps) {
  const theme = useTheme()
  const cardColor = color || theme.palette.primary.main

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          p: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: alpha(cardColor, 0.1),
            color: cardColor,
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <CardContent sx={{ p: 0, width: '100%' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
