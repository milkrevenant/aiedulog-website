'use client'

import React from 'react'
import {
  Box,
  Typography,
  Container,
  Button,
  Stack,
  useTheme,
  alpha,
} from '@mui/material'
import { motion } from 'framer-motion'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, HeroBlockContent } from '@/types/content-management'
import { 
  heroVariants,
  heroTitleVariants,
  heroSubtitleVariants,
  heroCTAVariants,
  performanceProps
} from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface HeroBlockProps {
  content: HeroBlockContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function HeroBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: HeroBlockProps) {
  const theme = useTheme()
  const { getVariants, shouldAnimate } = useAnimations()

  const handleCTAClick = () => {
    onInteraction?.('click', { element: 'cta_button', url: content.cta_url })
    if (content.cta_url) {
      window.open(content.cta_url, '_blank')
    }
  }

  // Get background styling
  const getBackgroundStyle = () => {
    switch (content.background_type) {
      case 'image':
        return {
          backgroundImage: content.background_url ? `url(${content.background_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      case 'gradient':
        if (content.background_gradient) {
          const { start, end, direction = '135deg' } = content.background_gradient
          return {
            background: `linear-gradient(${direction}, ${start}, ${end})`,
          }
        }
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        }
      case 'video':
        return {
          backgroundColor: theme.palette.grey[900],
        }
      default:
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        }
    }
  }

  // Determine text color based on background
  const textColor = content.background_type === 'gradient' || content.background_type === 'image' 
    ? 'white' 
    : 'text.primary'

  const MotionBox = motion(Box)
  const MotionTypography = motion(Typography)
  const MotionButton = motion(Button)

  return (
    <MotionBox
      initial="hidden"
      animate="visible"
      variants={shouldAnimate ? getVariants(heroVariants) : undefined}
      {...performanceProps}
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        ...getBackgroundStyle(),
      }}
    >
      {/* Overlay for better text readability on images */}
      {(content.background_type === 'image' || content.background_type === 'video') && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: alpha(theme.palette.common.black, 0.4),
            zIndex: 1,
          }}
        />
      )}

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ textAlign: 'center', color: textColor }}>
          <MotionTypography
            variant="h1"
            variants={shouldAnimate ? getVariants(heroTitleVariants) : undefined}
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' },
              fontWeight: 700,
              mb: 2,
              textShadow: content.background_type === 'image' ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
              background: shouldAnimate && !textColor.includes('white') 
                ? `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`
                : 'transparent',
              backgroundClip: shouldAnimate && !textColor.includes('white') ? 'text' : 'border-box',
              WebkitBackgroundClip: shouldAnimate && !textColor.includes('white') ? 'text' : 'border-box',
              WebkitTextFillColor: shouldAnimate && !textColor.includes('white') ? 'transparent' : 'inherit',
            }}
          >
            {getLocalizedText(content.title, language, 'Hero Title')}
          </MotionTypography>

          {content.subtitle && (
            <MotionTypography
              variant="h4"
              variants={shouldAnimate ? getVariants(heroSubtitleVariants) : undefined}
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                fontWeight: 300,
                mb: 4,
                opacity: 0.9,
                maxWidth: '800px',
                mx: 'auto',
                textShadow: content.background_type === 'image' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {getLocalizedText(content.subtitle, language)}
            </MotionTypography>
          )}

          {content.cta_text && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 4 }}>
              <MotionButton
                variant="contained"
                size="large"
                onClick={handleCTAClick}
                variants={shouldAnimate ? getVariants(heroCTAVariants) : undefined}
                whileHover={shouldAnimate ? "hover" : undefined}
                whileTap={shouldAnimate ? "tap" : undefined}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: theme.shadows[4],
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.main} 90%)`,
                    boxShadow: theme.shadows[8],
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 0,
                    height: 0,
                    borderRadius: '50%',
                    background: alpha(theme.palette.common.white, 0.3),
                    transform: 'translate(-50%, -50%)',
                    transition: 'width 0.6s ease, height 0.6s ease',
                  },
                  '&:hover::before': {
                    width: '300px',
                    height: '300px',
                  }
                }}
              >
                {getLocalizedText(content.cta_text, language)}
              </MotionButton>
            </Stack>
          )}
        </Box>
      </Container>
    </MotionBox>
  )
}