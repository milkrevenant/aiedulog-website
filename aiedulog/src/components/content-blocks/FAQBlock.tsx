'use client'

import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { ExpandMore } from '@mui/icons-material'
import DOMPurify from 'dompurify'
import { getLocalizedText } from '@/lib/content-client'
import type { LanguageCode, FAQContent } from '@/types/content-management'
import { staggerContainer, fadeVariants, performanceProps } from '@/lib/animations'
import { useAnimations } from '@/hooks/useAnimations'

interface FAQBlockProps {
  content: FAQContent
  metadata?: Record<string, any>
  language?: LanguageCode
  onInteraction?: (eventType: string, data?: any) => void
}

export function FAQBlock({ 
  content, 
  metadata, 
  language = 'ko',
  onInteraction 
}: FAQBlockProps) {
  const theme = useTheme()
  const { getVariants, shouldAnimate } = useAnimations()
  const [expanded, setExpanded] = React.useState<string | false>(false)
  
  const MotionContainer = motion(Container)
  const MotionAccordion = motion(Accordion)

  const handleExpansion = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
    
    if (isExpanded) {
      onInteraction?.('click', { 
        element: 'faq_expand', 
        faq_id: panel,
        question: content.items?.find((_, index) => `panel-${index}` === panel)
      })
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
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

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {content.items?.map((item, index) => {
          const panelId = `panel-${index}`
          
          return (
            <Accordion
              key={item.id || index}
              expanded={expanded === panelId}
              onChange={handleExpansion(panelId)}
              sx={{
                mb: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                boxShadow: 'none',
                '&:before': {
                  display: 'none',
                },
                '&:first-of-type': {
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                },
                '&:last-of-type': {
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                },
                '&.Mui-expanded': {
                  margin: '0 0 16px 0',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: theme.palette.grey[50],
                  borderRadius: '8px 8px 0 0',
                  '& .MuiAccordionSummary-content': {
                    margin: '16px 0',
                  },
                  '&.Mui-expanded': {
                    backgroundColor: theme.palette.primary.light,
                    '& .MuiTypography-root': {
                      color: theme.palette.primary.contrastText,
                      fontWeight: 600,
                    },
                    '& .MuiSvgIcon-root': {
                      color: theme.palette.primary.contrastText,
                    },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                  }}
                >
                  {getLocalizedText(item.question, language, `Question ${index + 1}`)}
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails
                sx={{
                  backgroundColor: 'background.paper',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  p: 3,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '1.1rem',
                    lineHeight: 1.7,
                    color: 'text.primary',
                    '& a': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      getLocalizedText(item.answer, language, 'Answer goes here...'),
                      {
                        ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li'],
                        ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
                      }
                    )
                  }}
                />
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>

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
            No FAQ items available
          </Typography>
        </Box>
      )}
    </Container>
  )
}