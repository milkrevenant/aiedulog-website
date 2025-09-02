'use client'

import { useMemo, useCallback } from 'react'
import { useMediaQuery, useTheme } from '@mui/material'
import { Variants } from 'framer-motion'
import {
  fadeVariants,
  slideVariants,
  scaleVariants,
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  heroVariants,
  heroTitleVariants,
  heroSubtitleVariants,
  heroCTAVariants,
  featureCardVariants,
  featureIconVariants,
  statsVariants,
  timelineVariants,
  timelineItemVariants,
  scrollTriggerVariants,
  magneticHoverVariants,
  shimmerVariants,
  reducedMotionVariants,
  createStaggerDelay,
  createResponsiveProps,
  performanceProps,
  createGradientAnimation,
  createColorTransition,
  ANIMATION_DURATIONS,
  EASING,
  STAGGER
} from '@/lib/animations'

export function useAnimations() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const shouldAnimate = !prefersReducedMotion

  const getVariants = useCallback((variants: Variants): Variants => {
    if (!shouldAnimate) {
      return reducedMotionVariants
    }
    
    if (isMobile) {
      const responsiveVariants = { ...variants }
      
      if (responsiveVariants.visible && typeof responsiveVariants.visible === 'object') {
        const visibleVariant = responsiveVariants.visible as any
        if (visibleVariant.transition) {
          visibleVariant.transition = {
            ...visibleVariant.transition,
            duration: Math.min(visibleVariant.transition.duration || ANIMATION_DURATIONS.normal, ANIMATION_DURATIONS.fast),
            ease: EASING.standard
          }
        }
      }
      
      return responsiveVariants
    }
    
    return variants
  }, [shouldAnimate, isMobile])

  const createStaggeredVariants = useCallback((baseVariant: Variants, staggerDelay = STAGGER.normal): Variants => {
    return {
      ...baseVariant,
      visible: {
        ...baseVariant.visible,
        transition: {
          ...(typeof baseVariant.visible === 'object' ? baseVariant.visible.transition || {} : {}),
          staggerChildren: staggerDelay,
          delayChildren: staggerDelay * 0.5
        }
      }
    }
  }, [])

  const createScrollVariants = useCallback((threshold = 0.1) => {
    return getVariants(scrollTriggerVariants(threshold))
  }, [getVariants])

  const createGradientProps = useCallback((primaryColor?: string, secondaryColor?: string) => {
    const primary = primaryColor || theme.palette.primary.main
    const secondary = secondaryColor || theme.palette.secondary.main
    return createGradientAnimation(primary, secondary)
  }, [theme])

  const createColorTransitionProps = useCallback((fromColor: string, toColor: string) => {
    return createColorTransition(fromColor, toColor)
  }, [])

  const getResponsiveProps = useMemo(() => {
    return createResponsiveProps(isMobile)
  }, [isMobile])

  const animationConfig = useMemo(() => ({
    durations: ANIMATION_DURATIONS,
    easing: EASING,
    stagger: STAGGER
  }), [])

  const presetVariants = useMemo(() => ({
    fade: getVariants(fadeVariants),
    slide: getVariants(slideVariants),
    scale: getVariants(scaleVariants),
    hero: getVariants(heroVariants),
    heroTitle: getVariants(heroTitleVariants),
    heroSubtitle: getVariants(heroSubtitleVariants),
    heroCTA: getVariants(heroCTAVariants),
    featureCard: getVariants(featureCardVariants),
    featureIcon: getVariants(featureIconVariants),
    stats: getVariants(statsVariants),
    timeline: getVariants(timelineVariants),
    timelineItem: getVariants(timelineItemVariants),
    magneticHover: getVariants(magneticHoverVariants),
    shimmer: getVariants(shimmerVariants),
    stagger: getVariants(staggerContainer),
    staggerFast: getVariants(staggerContainerFast),
    staggerSlow: getVariants(staggerContainerSlow)
  }), [getVariants])

  return {
    getVariants,
    shouldAnimate,
    isMobile,
    prefersReducedMotion,
    createStaggeredVariants,
    createScrollVariants,
    createStaggerDelay,
    createGradientProps,
    createColorTransitionProps,
    getResponsiveProps,
    performanceProps,
    animationConfig,
    presetVariants
  }
}