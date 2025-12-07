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

const MotionContainer = motion(Container)
const MotionTypography = motion(Typography)
const MotionGrid = motion(Grid)
const MotionBox = motion(Box)

interface StatsBlockProps {
  content: StatsContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

const useCounter = (endValue: number, shouldStart: boolean, shouldAnimate: boolean, duration: number = 2000) => {
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

interface StatItemProps {
  stat: StatsContent['items'][number]
  index: number
  isInView: boolean
  shouldAnimate: boolean
  getVariants: ReturnType<typeof useAnimations>['getVariants']
  language: LanguageCode
}

const formatNumber = (
  number: number,
  format?: string,
  prefix?: string,
  suffix?: string,
  language: LanguageCode = 'ko'
) => {
  let formatted = number.toString()
  
  if (format === 'percentage') {
    formatted = `${number}%`
  } else if (format === 'currency') {
    formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
      style: 'currency',
      currency: language === 'ko' ? 'KRW' : 'USD',
    }).format(number)
  } else if (format === 'compact') {
    formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { notation: 'compact' }).format(number)
  } else {
    formatted = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US').format(number)
  }
  
  return `${prefix || ''}${formatted}${suffix || ''}`
}

function StatItem({ stat, index, isInView, shouldAnimate, getVariants, language }: StatItemProps) {
  const theme = useTheme()
  const animatedValue = useCounter(stat.number, isInView, shouldAnimate, 1500 + index * 200)

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
        <Typography
          variant="h3"
          fontWeight={800}
          className="stat-number"
          sx={{
            display: 'inline-block',
            transition: 'transform 0.2s ease, background 0.4s ease',
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {formatNumber(animatedValue, stat.format, stat.prefix, stat.suffix, language)}
        </Typography>
        {stat.subtitle && (
          <Typography variant="body2" color="text.secondary">
            {getLocalizedText(stat.subtitle, language)}
          </Typography>
        )}
      </MotionBox>
    </Grid>
  )
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
        {content.items?.map((stat, index) => (
          <StatItem
            key={stat.id || index}
            stat={stat}
            index={index}
            isInView={isInView}
            shouldAnimate={shouldAnimate}
            getVariants={getVariants}
            language={language}
          />
        ))}
      </MotionGrid>
    </MotionContainer>
  );
}
