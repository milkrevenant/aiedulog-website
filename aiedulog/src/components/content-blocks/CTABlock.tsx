'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Container,
  Button,
  useTheme,
  alpha,
} from '@mui/material'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, CTAContent } from '@/types/content-management'
import { 
  fadeVariants,
  magneticHoverVariants,
  performanceProps
} from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface CTABlockProps {
  content: CTAContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function CTABlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: CTABlockProps) {
  const theme = useTheme()
  const { getVariants, shouldAnimate } = useAnimations()
  const [isHovered, setIsHovered] = useState(false)
  
  // Magnetic effect for button
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [30, -30])
  const rotateY = useTransform(x, [-100, 100], [-30, 30])

  const handleButtonClick = () => {
    onInteraction?.('click', { element: 'cta_button', url: content.button_url })
    if (content.button_url) {
      window.open(content.button_url, '_blank')
    }
  }

  const getButtonVariant = () => {
    switch (content.button_style) {
      case 'secondary': return 'outlined'
      case 'outlined': return 'outlined'
      default: return 'contained'
    }
  }

  const backgroundColor = content.background_color || `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!shouldAnimate) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const mouseX = event.clientX - centerX
    const mouseY = event.clientY - centerY
    
    x.set(mouseX)
    y.set(mouseY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
    setIsHovered(false)
  }

  const MotionBox = motion(Box)
  const MotionContainer = motion(Container)
  const MotionTypography = motion(Typography)
  const MotionButton = motion(Button)

  return (
    <MotionBox
      initial="hidden"
      whileInView="visible"
      variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
      {...performanceProps}
      sx={{
        py: { xs: 8, md: 12 },
        background: backgroundColor,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated decorative elements */}
      <MotionBox
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.15)} 0%, ${alpha(theme.palette.common.white, 0.05)} 70%, transparent 100%)`,
        }}
      />
      <MotionBox
        animate={{
          x: [0, -20, 0],
          y: [0, 30, 0],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.1)} 0%, ${alpha(theme.palette.common.white, 0.03)} 70%, transparent 100%)`,
        }}
      />

      <MotionContainer 
        maxWidth="md" 
        sx={{ position: 'relative', zIndex: 1 }}
        variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
      >
        <Box sx={{ textAlign: 'center' }}>
          <MotionTypography
            variant="h2"
            variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              mb: 3,
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              background: shouldAnimate 
                ? 'linear-gradient(45deg, rgba(255,255,255,1) 30%, rgba(255,255,255,0.8) 90%)'
                : 'transparent',
              backgroundClip: shouldAnimate ? 'text' : 'border-box',
              WebkitBackgroundClip: shouldAnimate ? 'text' : 'border-box',
              WebkitTextFillColor: shouldAnimate ? 'transparent' : 'inherit',
            }}
          >
            {getLocalizedText(content.title, language, 'Call to Action')}
          </MotionTypography>

          {content.description && (
            <MotionTypography
              variant="h5"
              variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                fontWeight: 300,
                mb: 4,
                opacity: 0.9,
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              {getLocalizedText(content.description, language)}
            </MotionTypography>
          )}

          <MotionButton
            variant={getButtonVariant()}
            size="large"
            onClick={handleButtonClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            variants={shouldAnimate ? getVariants(magneticHoverVariants) : undefined}
            whileHover={shouldAnimate ? "hover" : undefined}
            whileTap={shouldAnimate ? "tap" : undefined}
            style={shouldAnimate ? {
              rotateX: rotateX,
              rotateY: rotateY,
              transformStyle: 'preserve-3d',
            } : {}}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 3,
              backgroundColor: content.button_style === 'primary' ? 'white' : 'transparent',
              color: content.button_style === 'primary' ? theme.palette.primary.main : 'white',
              border: content.button_style === 'outlined' ? '2px solid white' : 'none',
              boxShadow: content.button_style === 'primary' ? theme.shadows[4] : 'none',
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
                background: content.button_style === 'primary' 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.common.white, 0.3),
                transform: 'translate(-50%, -50%)',
                transition: 'width 0.6s ease, height 0.6s ease',
              },
              '&:hover': {
                boxShadow: content.button_style === 'primary' 
                  ? `0 8px 25px ${alpha(theme.palette.common.black, 0.3)}` 
                  : `0 8px 25px ${alpha(theme.palette.common.white, 0.4)}`,
                backgroundColor: content.button_style === 'primary' 
                  ? theme.palette.grey[50] 
                  : alpha(theme.palette.common.white, 0.15),
              },
              '&:hover::before': {
                width: '300px',
                height: '300px',
              },
              '&:active': {
                transform: shouldAnimate ? 'scale(0.98)' : 'none',
              },
              // 3D perspective effect
              perspective: '1000px',
              '& span': {
                position: 'relative',
                zIndex: 1,
                display: 'inline-block',
                transform: shouldAnimate && isHovered ? 'translateZ(20px)' : 'translateZ(0px)',
                transition: 'transform 0.3s ease',
              },
            }}
          >
            <span>{getLocalizedText(content.button_text, language, 'Learn More')}</span>
          </MotionButton>
        </Box>
      </MotionContainer>
    </MotionBox>
  )
}