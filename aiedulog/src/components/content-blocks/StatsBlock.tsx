'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Container,
  
  useTheme,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { motion, useInView } from 'framer-motion'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, StatsContent } from '@/types/content-management'
import { 
  staggerContainer,
  statsVariants,
  fadeVariants,
  performanceProps
} from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface StatsBlockProps {
  content: StatsContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function StatsBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: StatsBlockProps) {
  const theme = useTheme()
  const { getVariants, shouldAnimate } = useAnimations()
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  // Animated counter hook
  const useCounter = (endValue: number, shouldStart: boolean, duration: number = 2000) => {
    const [count, setCount] = useState(0)
    
    useEffect(() => {
      if (!shouldStart || !shouldAnimate) {
        setCount(endValue)
        return
      }
      
      let startTime: number | null = null
      const startValue = 0
      
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime
        const progress = Math.min((currentTime - startTime) / duration, 1)
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutCubic)
        
        setCount(currentCount)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setCount(endValue)
        }
      }
      
      requestAnimationFrame(animate)
    }, [endValue, shouldStart, duration, shouldAnimate])
    
    return count
  }

  const formatNumber = (number: number, format?: string, prefix?: string, suffix?: string) => {
    let formatted = number.toString()
    
    if (format === 'percentage') {
      formatted = `${number}%`
    } else if (format === 'currency') {
      formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
        style: 'currency',
        currency: language === 'ko' ? 'KRW' : 'USD',
      }).format(number)
    } else {
      // Add thousand separators
      formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US').format(number)
    }
    
    return `${prefix || ''}${formatted}${suffix || ''}`
  }

  const MotionContainer = motion(Container)
  const MotionTypography = motion(Typography)
  const MotionGrid = motion(Grid)
  const MotionBox = motion(Box)

  return (
    <MotionContainer 
      maxWidth="lg" 
      sx={{ py: { xs: 6, md: 10 } }}
      ref={ref}
      initial="hidden"
      whileInView="visible"
      variants={shouldAnimate ? getVariants(staggerContainer) : undefined}
      {...performanceProps}
    >
      {content.title && (
        <MotionTypography
          variant="h2"
          variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 700,
            textAlign: 'center',
            mb: { xs: 4, md: 8 },
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {getLocalizedText(content.title, language)}
        </MotionTypography>
      )}
      <MotionGrid 
        container 
        spacing={4}
        variants={shouldAnimate ? getVariants(staggerContainer) : undefined}
      >
        {content.items?.map((stat, index) => {
          // Use animated counter for each stat
          const animatedValue = useCounter(stat.number, isInView, 1500 + (index * 200))
          
          return (
            <Grid
              key={stat.id || index}
              size={{
                xs: 12,
                sm: 6,
                md: 3
              }}>
              <MotionBox
                variants={shouldAnimate ? getVariants(statsVariants) : undefined}
                whileHover={shouldAnimate ? { 
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.2, ease: 'easeOut' }
                } : undefined}
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  '&:hover': {
                    boxShadow: `0px 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    '& .stat-number': {
                      transform: 'scale(1.05)',
                      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.tertiary.main} 90%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    },
                  },
                }}
              >
                <MotionTypography
                  className="stat-number"
                  variant="h2"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                    fontWeight: 800,
                    color: theme.palette.primary.main,
                    mb: 1,
                    fontFamily: '"IBM Plex Sans KR", monospace',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textShadow: `0 2px 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  {formatNumber(animatedValue, stat.format, stat.prefix, stat.suffix)}
                </MotionTypography>
                
                <MotionTypography
                  variant="h6"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                  }}
                >
                  {getLocalizedText(stat.label, language, `Stat ${index + 1}`)}
                </MotionTypography>
              </MotionBox>
            </Grid>
          );
        })}
      </MotionGrid>
    </MotionContainer>
  );
}