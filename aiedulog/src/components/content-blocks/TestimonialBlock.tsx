'use client'

import React from 'react'
import {
  Box,
  Typography,
  Container,
  
  Card,
  CardContent,
  Avatar,
  Rating,
  Stack,
  useTheme,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { FormatQuote } from '@mui/icons-material'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, TestimonialContent } from '@/types/content-management'

interface TestimonialBlockProps {
  content: TestimonialContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function TestimonialBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: TestimonialBlockProps) {
  const theme = useTheme()

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
      <Grid container spacing={4}>
        {content.items?.map((testimonial, index) => (
          <Grid
            key={testimonial.id || index}
            size={{
              xs: 12,
              md: 6
            }}>
            <Card
              sx={{
                height: '100%',
                position: 'relative',
                transition: 'all 0.3s ease',
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              {/* Quote icon */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -10,
                  left: 20,
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <FormatQuote sx={{ fontSize: 20 }} />
              </Box>

              <CardContent sx={{ p: 4, pt: 5 }}>
                {/* Rating */}
                {testimonial.rating && (
                  <Rating 
                    value={testimonial.rating} 
                    readOnly 
                    sx={{ mb: 2 }}
                    size="small"
                  />
                )}

                {/* Testimonial content */}
                <Typography
                  variant="body1"
                  sx={{
                    mb: 3,
                    fontStyle: 'italic',
                    fontSize: '1.1rem',
                    lineHeight: 1.7,
                    color: 'text.primary',
                  }}
                >
                  "{getLocalizedText(testimonial.content, language, 'Testimonial content')}"
                </Typography>

                {/* Author info */}
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={testimonial.author_avatar}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      width: 50,
                      height: 50,
                    }}
                  >
                    {testimonial.author_name?.charAt(0) || 'A'}
                  </Avatar>
                  
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        lineHeight: 1.2,
                      }}
                    >
                      {testimonial.author_name || 'Anonymous'}
                    </Typography>
                    
                    {testimonial.author_title && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 500,
                        }}
                      >
                        {testimonial.author_title}
                      </Typography>
                    )}
                    
                    {testimonial.author_company && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.primary.main,
                          fontSize: '0.875rem',
                        }}
                      >
                        {testimonial.author_company}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
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
            No testimonials available
          </Typography>
        </Box>
      )}
    </Container>
  );
}