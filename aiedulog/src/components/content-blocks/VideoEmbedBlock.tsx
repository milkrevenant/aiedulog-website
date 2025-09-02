'use client'

import React from 'react'
import {
  Box,
  Typography,
  Container,
  IconButton,
  useTheme,
} from '@mui/material'
import { PlayArrow } from '@mui/icons-material'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, VideoEmbedContent } from '@/types/content-management'

interface VideoEmbedBlockProps {
  content: VideoEmbedContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function VideoEmbedBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: VideoEmbedBlockProps) {
  const theme = useTheme()
  const [isPlaying, setIsPlaying] = React.useState(false)

  const getEmbedUrl = () => {
    const url = content.video_url
    if (!url) return null

    // YouTube
    if (content.video_type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = ''
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0]
      } else if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0]
      }
      
      if (videoId) {
        const autoplay = content.autoplay || isPlaying ? '1' : '0'
        const controls = content.controls !== false ? '1' : '0'
        const loop = content.loop ? '1' : '0'
        return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&controls=${controls}&loop=${loop}`
      }
    }

    // Vimeo
    if (content.video_type === 'vimeo' || url.includes('vimeo.com')) {
      const videoId = url.split('/').pop()
      if (videoId) {
        const autoplay = content.autoplay || isPlaying ? '1' : '0'
        return `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay}`
      }
    }

    // Direct video URL
    if (content.video_type === 'direct') {
      return url
    }

    return null
  }

  const handlePlay = () => {
    onInteraction?.('click', { element: 'video_play', video_url: content.video_url })
    setIsPlaying(true)
  }

  const embedUrl = getEmbedUrl()

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      {content.title && (
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 700,
            textAlign: 'center',
            mb: { xs: 4, md: 6 },
          }}
        >
          {getLocalizedText(content.title, language)}
        </Typography>
      )}
      <Box
        sx={{
          position: 'relative',
          paddingTop: '56.25%', // 16:9 aspect ratio
          backgroundColor: theme.palette.grey[900],
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: theme.shadows[8],
        }}
      >
        {isPlaying && embedUrl ? (
          // Show actual video iframe
          (content.video_type === 'direct' ? (<Box
            component="video"
            src={embedUrl}
            controls={content.controls !== false}
            autoPlay={content.autoplay}
            loop={content.loop}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          />) : (<Box
            component="iframe"
            src={embedUrl}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />))
        ) : (
          // Show thumbnail/preview
          (<Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundImage: content.thumbnail_url ? `url(${content.thumbnail_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              '&:hover': {
                '& .play-button': {
                  transform: 'scale(1.1)',
                  backgroundColor: theme.palette.primary.dark,
                },
              },
            }}
            onClick={handlePlay}
          >
            {/* Dark overlay for better button visibility */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }}
            />
            {/* Play button */}
            <IconButton
              className="play-button"
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                width: 80,
                height: 80,
                transition: 'all 0.3s ease',
                zIndex: 1,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            >
              <PlayArrow sx={{ fontSize: 48 }} />
            </IconButton>
          </Box>)
        )}
      </Box>
      {!content.video_url && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6">
            No video URL provided
          </Typography>
        </Box>
      )}
    </Container>
  );
}