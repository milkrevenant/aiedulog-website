'use client'

import React from 'react'
import {
  Box,
  Typography,
  Container,
  
  useTheme,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, ImageGalleryContent } from '@/types/content-management'

interface ImageGalleryBlockProps {
  content: ImageGalleryContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function ImageGalleryBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: ImageGalleryBlockProps) {
  const theme = useTheme()

  const handleImageClick = (image: any, index: number) => {
    onInteraction?.('click', { 
      element: 'gallery_image', 
      image_index: index,
      image_url: image.image_url,
      url: image.link_url 
    })
    
    if (image.link_url) {
      window.open(image.link_url, '_blank')
    }
  }

  const getGridColumns = () => {
    const columns = content.columns || 3
    if (columns === 2) return { xs: 12, sm: 6 }
    if (columns === 4) return { xs: 12, sm: 6, md: 3 }
    return { xs: 12, sm: 6, md: 4 } // default 3 columns
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      {content.title && (
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 700,
            textAlign: 'center',
            mb: { xs: 4, md: 8 },
          }}
        >
          {getLocalizedText(content.title, language)}
        </Typography>
      )}

      <Grid container spacing={3}>
        {content.items?.map((image, index) => (
          <Grid size={getGridColumns()} key={image.id || index}>
            <Box
              onClick={() => handleImageClick(image, index)}
              sx={{
                position: 'relative',
                height: 250,
                borderRadius: 2,
                overflow: 'hidden',
                cursor: image.link_url ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                boxShadow: theme.shadows[2],
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: theme.shadows[8],
                  '& .image-overlay': {
                    opacity: 1,
                  },
                },
              }}
            >
              {/* Image */}
              <Box
                component="img"
                src={image.image_url}
                alt={getLocalizedText(image.alt_text, language, `Gallery image ${index + 1}`)}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  // Fallback for broken images
                  const target = e.target as HTMLElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.style.backgroundColor = theme.palette.grey[200]
                    parent.innerHTML = `
                      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: ${theme.palette.text.secondary}; font-size: 14px;">
                        Image not available
                      </div>
                    `
                  }
                }}
              />

              {/* Caption overlay */}
              {image.caption && (
                <Box
                  className="image-overlay"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: 'white',
                    p: 2,
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {getLocalizedText(image.caption, language)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Empty state */}
      {(!content.items || content.items.length === 0) && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6">
            No images available
          </Typography>
        </Box>
      )}
    </Container>
  )
}