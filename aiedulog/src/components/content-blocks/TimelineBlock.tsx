'use client'

import React from 'react'
import {
  Box,
  Typography,
  Container,
  useTheme,
  alpha,
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab'
import { motion } from 'framer-motion'
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, TimelineContent as TimelineBlockContent } from '@/types/content-management'
import { 
  timelineVariants,
  timelineItemVariants,
  fadeVariants,
  performanceProps
} from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface TimelineBlockProps {
  content: TimelineBlockContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function TimelineBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: TimelineBlockProps) {
  const theme = useTheme()
  const { getVariants, shouldAnimate } = useAnimations()

  const MotionContainer = motion(Container)
  const MotionTypography = motion(Typography)
  const MotionTimeline = motion(Timeline)
  const MotionTimelineItem = motion(TimelineItem)
  const MotionTimelineDot = motion(TimelineDot)
  const MotionTimelineConnector = motion(TimelineConnector)

  return (
    <MotionContainer 
      maxWidth="md" 
      sx={{ py: { xs: 6, md: 10 } }}
      initial="hidden"
      whileInView="visible"
      variants={shouldAnimate ? getVariants(timelineVariants) : undefined}
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

      <MotionTimeline 
        position={content.orientation === 'horizontal' ? 'alternate' : 'right'}
        variants={shouldAnimate ? getVariants(timelineVariants) : undefined}
      >
        {content.items?.map((item, index) => (
          <MotionTimelineItem 
            key={item.id || index}
            variants={shouldAnimate ? getVariants(timelineItemVariants) : undefined}
          >
            <TimelineSeparator>
              <MotionTimelineDot 
                color="primary" 
                initial={shouldAnimate ? { scale: 0, opacity: 0 } : undefined}
                animate={shouldAnimate ? { scale: 1, opacity: 1 } : undefined}
                transition={shouldAnimate ? { delay: index * 0.2, duration: 0.5, type: 'spring' } : undefined}
                whileHover={shouldAnimate ? { 
                  scale: 1.2, 
                  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.6)}`
                } : undefined}
                sx={{ 
                  p: 1,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                }}
              >
                <CheckCircle sx={{ color: 'white' }} />
              </MotionTimelineDot>
              {index < (content.items?.length || 0) - 1 && (
                <MotionTimelineConnector 
                  initial={shouldAnimate ? { height: 0, opacity: 0 } : undefined}
                  animate={shouldAnimate ? { height: 60, opacity: 1 } : undefined}
                  transition={shouldAnimate ? { 
                    delay: index * 0.2 + 0.3, 
                    duration: 0.8, 
                    ease: 'easeOut' 
                  } : undefined}
                  sx={{ 
                    background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.3)} 100%)`,
                    width: 3,
                  }} 
                />
              )}
            </TimelineSeparator>
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <motion.div
                variants={shouldAnimate ? {
                  hidden: { opacity: 0, x: content.orientation === 'horizontal' && index % 2 === 0 ? -50 : 50 },
                  visible: { 
                    opacity: 1, 
                    x: 0,
                    transition: { delay: index * 0.2 + 0.4, duration: 0.6 }
                  }
                } : undefined}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 1,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      width: 0,
                      height: 2,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      transition: 'width 0.6s ease',
                    },
                    '&:hover::after': {
                      width: '100%',
                    },
                  }}
                >
                  {getLocalizedText(item.title, language, `Event ${index + 1}`)}
                </Typography>
                
                {item.date && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.primary.main,
                      fontWeight: 500,
                      mb: 1,
                      display: 'inline-block',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      background: alpha(theme.palette.primary.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    {item.date}
                  </Typography>
                )}
                
                {item.description && (
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      mt: 1,
                    }}
                  >
                    {getLocalizedText(item.description, language)}
                  </Typography>
                )}
              </motion.div>
            </TimelineContent>
          </MotionTimelineItem>
        ))}
      </MotionTimeline>
    </MotionContainer>
  )
}