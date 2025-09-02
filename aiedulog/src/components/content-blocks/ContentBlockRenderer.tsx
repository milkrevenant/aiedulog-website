'use client'

import React from 'react'
import { Box } from '@mui/material'
import { motion } from 'framer-motion'
import type { 
  ContentBlock, 
  LanguageCode 
} from '@/types/content-management'
import { trackContentInteraction } from '@/lib/content-client'
import { scrollTriggerVariants, performanceProps } from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

// Import all block renderers
import { HeroBlock } from './HeroBlock'
import { FeatureGridBlock } from './FeatureGridBlock'
import { StatsBlock } from './StatsBlock'
import { TimelineBlock } from './TimelineBlock'
import { TextRichBlock } from './TextRichBlock'
import { ImageGalleryBlock } from './ImageGalleryBlock'
import { VideoEmbedBlock } from './VideoEmbedBlock'
import { CTABlock } from './CTABlock'
import { TestimonialBlock } from './TestimonialBlock'
import { FAQBlock } from './FAQBlock'

// ============================================================================
// CONTENT BLOCK RENDERER COMPONENT
// ============================================================================

interface ContentBlockRendererProps {
  block: ContentBlock
  language?: LanguageCode
  className?: string
  onInteraction?: (eventType: string, data?: any) => void
}

export function ContentBlockRenderer({ 
  block, 
  language = 'ko', 
  className,
  onInteraction 
}: ContentBlockRendererProps) {
  const { getVariants, shouldAnimate } = useAnimations()
  
  // Track block view
  React.useEffect(() => {
    if (block.click_tracking) {
      trackContentInteraction('block', block.id, 'view')
    }
  }, [block.id, block.click_tracking])

  const handleInteraction = (eventType: string, data?: any) => {
    if (block.click_tracking) {
      trackContentInteraction('block', block.id, eventType as any, data)
    }
    onInteraction?.(eventType, data)
  }

  // Apply layout configuration
  const layoutConfig = block.layout_config || {}
  const containerWidth = layoutConfig.container_width || 'wide'
  const padding = layoutConfig.padding || { top: 4, bottom: 4, left: 2, right: 2 }
  const margin = layoutConfig.margin || { top: 0, bottom: 0 }
  const background = layoutConfig.background || { type: 'none' }

  const containerSx = {
    width: containerWidth === 'full' ? '100%' : 
           containerWidth === 'narrow' ? 'min(600px, 100%)' : 
           'min(1200px, 100%)',
    mx: 'auto',
    py: `${padding.top}rem ${padding.bottom}rem`,
    px: `${padding.left}rem ${padding.right}rem`,
    mt: `${margin.top}rem`,
    mb: `${margin.bottom}rem`,
    ...(background.type === 'color' && { bgcolor: background.value }),
    ...(background.type === 'gradient' && { 
      background: background.value 
    }),
  }

  const MotionBox = motion(Box)

  // Render the appropriate block component
  const renderBlock = () => {
    switch (block.block_type) {
      case 'hero':
        return (
          <HeroBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'feature_grid':
        return (
          <FeatureGridBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'stats':
        return (
          <StatsBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'timeline':
        return (
          <TimelineBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'text_rich':
        return (
          <TextRichBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'image_gallery':
        return (
          <ImageGalleryBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'video_embed':
        return (
          <VideoEmbedBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'cta':
        return (
          <CTABlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'testimonial':
        return (
          <TestimonialBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      case 'faq':
        return (
          <FAQBlock 
            content={block.content as any}
            metadata={block.metadata}
            language={language}
            onInteraction={handleInteraction}
          />
        )

      default:
        console.warn(`Unknown block type: ${block.block_type}`)
        return (
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            Unknown block type: {block.block_type}
          </Box>
        )
    }
  }

  return (
    <MotionBox 
      className={className}
      sx={containerSx}
      data-block-id={block.id}
      data-block-type={block.block_type}
      initial={shouldAnimate ? "hidden" : undefined}
      whileInView={shouldAnimate ? "visible" : undefined}
      variants={shouldAnimate ? getVariants(scrollTriggerVariants()) : undefined}
      {...performanceProps}
    >
      {renderBlock()}
    </MotionBox>
  )
}

// ============================================================================
// CONTENT SECTION RENDERER COMPONENT
// ============================================================================

interface ContentSectionRendererProps {
  blocks: ContentBlock[]
  language?: LanguageCode
  className?: string
  userContext?: {
    isLoggedIn?: boolean
    userRole?: string
    membershipLevel?: string
  }
}

export function ContentSectionRenderer({ 
  blocks, 
  language = 'ko', 
  className,
  userContext 
}: ContentSectionRendererProps) {
  
  // Filter blocks based on visibility and conditions
  const visibleBlocks = blocks.filter(block => {
    // Check visibility level
    if (block.visibility === 'admin_only') {
      return userContext?.userRole === 'admin'
    }
    
    if (block.visibility === 'members_only') {
      return userContext?.isLoggedIn === true
    }
    
    return block.is_active
  })

  return (
    <Box className={className}>
      {visibleBlocks.map((block) => (
        <ContentBlockRenderer
          key={block.id}
          block={block}
          language={language}
        />
      ))}
    </Box>
  )
}

// Default export
export default ContentBlockRenderer