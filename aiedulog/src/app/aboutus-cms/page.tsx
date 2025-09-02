'use client'

import React from 'react'
import { Box, Container, Typography, CircularProgress } from '@mui/material'
import { ContentSectionRenderer } from '@/components/content-blocks'
import { fetchContentSection, generateSEOMetadata } from '@/lib/content-client'
import type { MainContentSection } from '@/types/content-management'

export default function AboutUsCMSPage() {
  const [section, setSection] = React.useState<MainContentSection | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true)
        const contentSection = await fetchContentSection('about-us', 'ko')
        setSection(contentSection)
      } catch (err: any) {
        setError(err.message || 'Failed to load content')
        console.error('Error loading about-us content:', err)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [])

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '50vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="error" gutterBottom>
            Content Loading Error
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </Container>
    )
  }

  if (!section) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            About Us Content Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The about-us content section has not been created yet. Please use the admin panel to create it.
          </Typography>
        </Box>
      </Container>
    )
  }

  // Get content blocks from the section
  const blocks = (section as any).content_blocks || []

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Render content blocks */}
      <ContentSectionRenderer 
        blocks={blocks}
        language="ko"
        userContext={{
          isLoggedIn: false, // You can get this from auth context
          userRole: 'user'
        }}
      />
    </Box>
  )
}