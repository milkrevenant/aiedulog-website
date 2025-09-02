'use client'

import { Variants, Transition, MotionProps } from 'framer-motion'

// ============================================================================
// ANIMATION CONFIGURATION & UTILITIES
// ============================================================================

/**
 * Core animation system for the CMS
 * Based on Material Design 3 principles and theme colors
 */

// Animation durations following Material Design 3
export const ANIMATION_DURATIONS = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  page: 1.0
} as const

// Easing curves optimized for natural motion
export const EASING = {
  // Standard Material Design 3 curves
  standard: [0.2, 0.0, 0, 1.0],
  decelerate: [0.0, 0.0, 0.2, 1.0],
  accelerate: [0.4, 0.0, 1.0, 1.0],
  
  // Custom curves for delight
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.25, 0.46, 0.45, 0.94],
  smooth: [0.25, 0.1, 0.25, 1],
  
  // Performance optimized
  linear: [0, 0, 1, 1],
} as const

// Stagger timing for sequential animations
export const STAGGER = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
  slower: 0.2
} as const

// ============================================================================
// CORE ANIMATION VARIANTS
// ============================================================================

/**
 * Fade animations with various directions
 */
export const fadeVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING.decelerate
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.accelerate
    }
  }
}

/**
 * Slide animations from different directions
 */
export const slideVariants: Variants = {
  hiddenLeft: { 
    opacity: 0, 
    x: -60 
  },
  hiddenRight: { 
    opacity: 0, 
    x: 60 
  },
  hiddenUp: { 
    opacity: 0, 
    y: -60 
  },
  hiddenDown: { 
    opacity: 0, 
    y: 60 
  },
  visible: { 
    opacity: 1, 
    x: 0, 
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING.smooth
    }
  }
}

/**
 * Scale animations with bounce effect
 */
export const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING.bounce
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.elastic
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.standard
    }
  }
}

/**
 * Staggered container animations
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.1,
      type: 'tween'
    }
  }
}

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.fast,
      delayChildren: 0.05,
      type: 'tween'
    }
  }
}

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.slow,
      delayChildren: 0.2,
      type: 'tween'
    }
  }
}

// ============================================================================
// SPECIALIZED BLOCK ANIMATIONS
// ============================================================================

/**
 * Hero block animations with dramatic entrance
 */
export const heroVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 100, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.slower,
      ease: EASING.smooth,
      staggerChildren: STAGGER.normal,
      delayChildren: 0.2
    }
  }
}

export const heroTitleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 50 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: EASING.decelerate
    }
  }
}

export const heroSubtitleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: EASING.decelerate,
      delay: 0.2
    }
  }
}

export const heroCTAVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING.bounce,
      delay: 0.4
    }
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.elastic
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATIONS.fast / 2
    }
  }
}

/**
 * Feature grid animations with staggered cards
 */
export const featureCardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 50, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING.smooth
    }
  },
  hover: {
    y: -8,
    scale: 1.02,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.elastic
    }
  }
}

export const featureIconVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.5, 
    rotate: -180 
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    rotate: 0,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: EASING.bounce,
      delay: 0.2
    }
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.elastic
    }
  }
}

/**
 * Stats counter animations
 */
export const statsVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING.bounce
    }
  }
}

/**
 * Timeline animations with progressive reveal
 */
export const timelineVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.slow,
      delayChildren: 0.1
    }
  }
}

export const timelineItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -50, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: EASING.smooth
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a stagger delay based on index
 */
export const createStaggerDelay = (index: number, staggerAmount = STAGGER.normal): number => {
  return index * staggerAmount
}

/**
 * Creates a scroll-triggered animation
 */
export const scrollTriggerVariants = (threshold = 0.1): Variants => ({
  hidden: { 
    opacity: 0, 
    y: 60 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: EASING.decelerate
    }
  }
})

/**
 * Creates magnetic hover effect for interactive elements
 */
export const magneticHoverVariants: Variants = {
  rest: { 
    scale: 1, 
    y: 0 
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.elastic
    }
  },
  tap: {
    scale: 0.95,
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.fast / 2
    }
  }
}

/**
 * Creates loading shimmer effect
 */
export const shimmerVariants: Variants = {
  initial: { 
    backgroundPosition: '-100% 0' 
  },
  animate: {
    backgroundPosition: '100% 0',
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop'
    }
  }
}

/**
 * Reduced motion variants for accessibility
 */
export const reducedMotionVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.linear
    }
  }
}

// ============================================================================
// RESPONSIVE ANIMATION PROPS
// ============================================================================

/**
 * Creates responsive animation props based on screen size
 */
export const createResponsiveProps = (isMobile: boolean): MotionProps => ({
  initial: 'hidden',
  animate: 'visible',
  exit: 'exit',
  transition: {
    duration: isMobile ? ANIMATION_DURATIONS.fast : ANIMATION_DURATIONS.normal,
    ease: EASING.standard
  }
})

/**
 * Performance-optimized animation props
 */
export const performanceProps: MotionProps = {
  layout: false,
  whileInView: 'visible',
  viewport: { once: true, amount: 0.1, margin: '50px' },
  transition: {
    duration: ANIMATION_DURATIONS.normal,
    ease: EASING.decelerate,
    type: 'tween'
  }
}

// ============================================================================
// THEME-AWARE ANIMATION HELPERS
// ============================================================================

/**
 * Creates gradient animation keyframes using theme colors
 */
export const createGradientAnimation = (primaryColor: string, secondaryColor: string) => ({
  background: [
    `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 100%)`,
    `linear-gradient(45deg, ${secondaryColor} 0%, ${primaryColor} 50%, ${secondaryColor} 100%)`,
    `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 100%)`
  ],
  transition: {
    duration: 3,
    ease: 'linear',
    repeat: Infinity,
    repeatType: 'loop' as const
  }
})

/**
 * Creates color transition animation
 */
export const createColorTransition = (fromColor: string, toColor: string) => ({
  color: toColor,
  transition: {
    duration: ANIMATION_DURATIONS.normal,
    ease: EASING.decelerate
  }
})

export default {
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
}