'use client'

import React from 'react'
import {
  Box,
  Container,
  useTheme,
} from '@mui/material'
import { ClientSanitizedContent } from '@/components/client/ClientSanitizedContent'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, TextRichContent } from '@/types/content-management'

interface TextRichBlockProps {
  content: TextRichContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function TextRichBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: TextRichBlockProps) {
  const theme = useTheme()

  const textContent = getLocalizedText(content.content, language, '<p>Rich text content goes here...</p>')

  // Handle link clicks for analytics
  const handleContentClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.tagName === 'A') {
      const href = target.getAttribute('href')
      onInteraction?.('click', { 
        element: 'link', 
        url: href,
        text: target.textContent 
      })
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box
        onClick={handleContentClick}
        sx={{
          // Typography styles
          '& p': {
            mb: 2,
            fontSize: '1.1rem',
            lineHeight: 1.8,
            color: theme.palette.text.primary,
          },
          '& h1': {
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 700,
            mt: 4,
            mb: 2,
            color: theme.palette.text.primary,
          },
          '& h2': {
            fontSize: { xs: '1.75rem', md: '2rem' },
            fontWeight: 600,
            mt: 3,
            mb: 2,
            color: theme.palette.text.primary,
          },
          '& h3': {
            fontSize: { xs: '1.5rem', md: '1.75rem' },
            fontWeight: 600,
            mt: 3,
            mb: 2,
            color: theme.palette.text.primary,
          },
          '& h4': {
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            fontWeight: 600,
            mt: 2,
            mb: 1.5,
            color: theme.palette.text.primary,
          },
          '& h5': {
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            fontWeight: 600,
            mt: 2,
            mb: 1.5,
            color: theme.palette.text.primary,
          },
          '& h6': {
            fontSize: { xs: '1rem', md: '1.125rem' },
            fontWeight: 600,
            mt: 2,
            mb: 1,
            color: theme.palette.text.primary,
          },
          // Lists
          '& ul': {
            pl: 3,
            mb: 2,
            '& li': {
              mb: 0.5,
              fontSize: '1.1rem',
              lineHeight: 1.7,
            },
          },
          '& ol': {
            pl: 3,
            mb: 2,
            '& li': {
              mb: 0.5,
              fontSize: '1.1rem',
              lineHeight: 1.7,
            },
          },
          // Links
          '& a': {
            color: theme.palette.primary.main,
            textDecoration: 'none',
            borderBottom: `1px solid ${theme.palette.primary.light}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              color: theme.palette.primary.dark,
              borderBottomColor: theme.palette.primary.dark,
            },
          },
          // Blockquotes
          '& blockquote': {
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            pl: 3,
            py: 1,
            my: 3,
            backgroundColor: theme.palette.grey[50],
            fontStyle: 'italic',
            '& p': {
              mb: 1,
            },
          },
          // Code blocks
          '& pre': {
            backgroundColor: theme.palette.grey[900],
            color: theme.palette.common.white,
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            mb: 2,
            '& code': {
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            },
          },
          // Inline code
          '& code': {
            backgroundColor: theme.palette.grey[100],
            color: theme.palette.text.primary,
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '0.875rem',
            fontFamily: 'monospace',
          },
          // Tables
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            mb: 2,
            '& th': {
              backgroundColor: theme.palette.grey[100],
              fontWeight: 600,
              p: 1.5,
              border: `1px solid ${theme.palette.grey[300]}`,
              textAlign: 'left',
            },
            '& td': {
              p: 1.5,
              border: `1px solid ${theme.palette.grey[300]}`,
            },
          },
          // Images
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 1,
            my: 2,
          },
          // HR
          '& hr': {
            border: 'none',
            borderTop: `2px solid ${theme.palette.grey[200]}`,
            my: 4,
          },
        }}
      >
        {content.format === 'html' || content.format === 'markdown' ? (
          <ClientSanitizedContent
            html={textContent}
            options="RICH_TEXT"
            fallback={
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {textContent.replace(/<[^>]*>/g, '')}
              </div>
            }
          />
        ) : (
          // Plain text
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {textContent}
          </div>
        )}
      </Box>
    </Container>
  );
}