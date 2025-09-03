'use client'

import React from 'react'
import {
  Box,
  Typography,
  Container,
  
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Speed, 
  Security, 
  Group, 
  Build, 
  Analytics 
} from '@mui/icons-material'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, FeatureGridContent } from '@/types/content-management'
import { 
  staggerContainer,
  featureCardVariants,
  featureIconVariants,
  fadeVariants,
  performanceProps
} from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface FeatureGridBlockProps {
  content: FeatureGridContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function FeatureGridBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: FeatureGridBlockProps) {
  const theme = useTheme()
  const { getVariants, shouldAnimate } = useAnimations()

  // Icon mapping for common icons
  const iconMap: Record<string, React.ComponentType> = {
    'trending_up': TrendingUp,
    'speed': Speed,
    'security': Security,
    'group': Group,
    'build': Build,
    'analytics': Analytics,
  }

  const handleFeatureClick = (feature: any, index: number) => {
    onInteraction?.('click', { 
      element: 'feature_item', 
      feature_id: feature.id,
      feature_index: index,
      url: feature.link_url 
    })
    
    if (feature.link_url) {
      window.open(feature.link_url, '_blank')
    }
  }

  const getFeatureIcon = (iconName?: string) => {
    if (!iconName) return TrendingUp
    
    const IconComponent = iconMap[iconName.toLowerCase()] || TrendingUp
    return IconComponent
  }

  const MotionContainer = motion(Container)
  const MotionTypography = motion(Typography)
  const MotionGrid = motion(Grid)
  const MotionCard = motion(Card)
  const MotionBox = motion(Box)

  return (
    <MotionContainer 
      maxWidth="lg" 
      sx={{ py: { xs: 6, md: 10 } }}
      initial="hidden"
      whileInView="visible"
      variants={shouldAnimate ? getVariants(staggerContainer) : undefined}
      {...performanceProps}
    >
      {content.title && (
        <MotionBox 
          sx={{ textAlign: 'center', mb: { xs: 4, md: 8 } }}
          variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
        >
          <MotionTypography
            variant="h2"
            variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              mb: 2,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {getLocalizedText(content.title, language)}
          </MotionTypography>
        </MotionBox>
      )}
      {content.subtitle && (
        <MotionTypography
          variant="h5"
          variants={shouldAnimate ? getVariants(fadeVariants) : undefined}
          sx={{
            textAlign: 'center',
            mb: { xs: 4, md: 6 },
            color: 'text.secondary',
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          {getLocalizedText(content.subtitle, language)}
        </MotionTypography>
      )}
      <MotionGrid 
        container 
        spacing={4}
        variants={shouldAnimate ? getVariants(staggerContainer) : undefined}
      >
        {content.items?.map((feature, index) => {
          const IconComponent = getFeatureIcon(feature.icon)
          
          return (
            <Grid
              key={feature.id || index}
              size={{
                xs: 12,
                sm: content.columns === 2 ? 6 : content.columns === 4 ? 6 : 4,
                md: content.columns === 2 ? 6 : content.columns === 4 ? 3 : 4
              }}>
              <MotionCard
                variants={shouldAnimate ? getVariants(featureCardVariants) : undefined}
                whileHover={shouldAnimate ? "hover" : undefined}
                sx={{
                  height: '100%',
                  cursor: feature.link_url ? 'pointer' : 'default',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                  '&:hover': {
                    boxShadow: `0px 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    '& .feature-icon': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
                onClick={() => handleFeatureClick(feature, index)}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', height: '100%' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Icon */}
                    <MotionBox 
                      sx={{ mb: 3 }}
                      variants={shouldAnimate ? getVariants(featureIconVariants) : undefined}
                    >
                      <IconComponent
                        className="feature-icon"
                        sx={{
                          fontSize: { xs: 40, sm: 48 },
                          color: alpha(theme.palette.primary.main, 0.7),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          filter: `drop-shadow(0 2px 4px ${alpha(theme.palette.primary.main, 0.2)})`,
                        }}
                      />
                    </MotionBox>

                    {/* Title */}
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {getLocalizedText(feature.title, language, `Feature ${index + 1}`)}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.7,
                        flexGrow: 1,
                      }}
                    >
                      {getLocalizedText(feature.description, language, 'Feature description')}
                    </Typography>

                    {/* Image if provided */}
                    {feature.image_url && (
                      <Box
                        sx={{
                          mt: 2,
                          height: 120,
                          backgroundImage: `url(${feature.image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          );
        })}
      </MotionGrid>
    </MotionContainer>
  );
}