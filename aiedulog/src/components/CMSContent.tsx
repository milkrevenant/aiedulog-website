'use client'

import React from 'react'
import { Box, Container, Typography, CircularProgress, Alert, alpha } from '@mui/material'
import { motion } from 'framer-motion'
import { ContentSectionRenderer } from '@/components/content-blocks'
import { useContentSection } from '@/hooks/useContentSection'
import type { LanguageCode } from '@/types/content-management'
import { staggerContainer, fadeVariants } from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface CMSContentProps {
  sectionKey: string
  language?: LanguageCode
  fallbackContent?: React.ReactNode
  userContext?: {
    isLoggedIn?: boolean
    userRole?: string
    membershipLevel?: string
  }
  containerProps?: any
}

export function CMSContent({
  sectionKey,
  language = 'ko',
  fallbackContent,
  userContext = { isLoggedIn: false, userRole: 'user' },
  containerProps = {}
}: CMSContentProps) {
  const { getVariants, shouldAnimate } = useAnimations()
  const { section, blocks, loading, error, refetch } = useContentSection({
    sectionKey,
    language
  })

  const MotionBox = motion(Box)
  const MotionContainer = motion(Container)

  if (loading) {
    return (
      <MotionBox 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        sx={{ 
          minHeight: '50vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...containerProps.sx
        }}
      >
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <CircularProgress size={60} thickness={3} />
        </motion.div>
      </MotionBox>
    )
  }

  if (error && !section) {
    return fallbackContent ? (
      <>{fallbackContent}</>
    ) : (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Content Loading Issue
          </Typography>
          <Typography variant="body2">
            {error}. Using fallback content or the section may not exist yet.
          </Typography>
        </Alert>
      </Container>
    )
  }

  if (!section && fallbackContent) {
    return <>{fallbackContent}</>
  }

  if (!section) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Content Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The "{sectionKey}" content section has not been created yet.
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <MotionBox 
      {...containerProps}
      initial={shouldAnimate ? "hidden" : false}
      animate={shouldAnimate ? "visible" : false}
      variants={shouldAnimate ? getVariants(staggerContainer) : undefined}
    >
      <ContentSectionRenderer 
        blocks={blocks}
        language={language}
        userContext={userContext}
      />
    </MotionBox>
  )
}

export default CMSContent