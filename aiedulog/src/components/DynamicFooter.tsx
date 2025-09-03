'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Box,
  Container,
  
  Typography,
  Stack,
  IconButton,
  Divider,
  Link as MuiLink,
  CircularProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  YouTube,
  LinkedIn,
  Twitter,
  Facebook,
  Instagram,
  GitHub,
  Telegram,
  Chat,
} from '@mui/icons-material'
import { FooterData, FooterCategory, FooterSocialLink } from '@/types/footer-management'

// Icon mapping for social media platforms
const SOCIAL_ICONS: Record<string, any> = {
  YouTube,
  LinkedIn,
  Twitter,
  Facebook,
  Instagram,
  GitHub,
  Telegram,
  Discord: Chat, // Use Chat icon as fallback for Discord
}

interface DynamicFooterProps {
  language?: 'ko' | 'en'
}

export default function DynamicFooter({ language = 'ko' }: DynamicFooterProps) {
  const [footerData, setFooterData] = useState<FooterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFooterData()
  }, [])

  const loadFooterData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/footer', {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=300', // Cache for 5 minutes
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load footer data')
      }

      const result = await response.json()
      setFooterData(result.data)
    } catch (err) {
      console.error('Error loading footer data:', err)
      setError('Failed to load footer data')
      
      // Fallback to hardcoded data if API fails
      setFooterData({
        categories: [],
        socialLinks: [],
        settings: {
          copyright: {
            id: 'copyright',
            setting_key: 'copyright',
            setting_value_ko: '© 2025 AIedulog',
            setting_value_en: '© 2025 AIedulog',
            is_active: true,
            created_at: '',
            updated_at: '',
          },
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = (category: FooterCategory) => {
    return language === 'en' && category.title_en 
      ? category.title_en 
      : category.title_ko
  }

  const getLinkTitle = (link: any) => {
    return language === 'en' && link.title_en 
      ? link.title_en 
      : link.title_ko
  }

  const getSetting = (key: string) => {
    const setting = footerData?.settings[key]
    if (!setting) return ''
    
    const valueKey = `setting_value_${language}` as keyof typeof setting
    return setting[valueKey] || setting.setting_value_ko || ''
  }

  const renderSocialIcon = (socialLink: FooterSocialLink) => {
    const IconComponent = SOCIAL_ICONS[socialLink.icon_name]
    
    if (!IconComponent) {
      console.warn(`Unknown social icon: ${socialLink.icon_name}`)
      return null
    }

    return (
      <IconButton
        key={socialLink.id}
        component="a"
        href={socialLink.url}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        sx={{
          color: '#888',
          '&:hover': { color: '#fff' },
        }}
      >
        <IconComponent fontSize="small" />
      </IconButton>
    )
  }

  if (loading) {
    return (
      <Box
        sx={{
          bgcolor: '#1a1a1a',
          color: '#fff',
          pt: 8,
          pb: 4,
        }}
      >
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress color="inherit" />
          </Box>
        </Container>
      </Box>
    )
  }

  if (error || !footerData) {
    // Fallback footer with minimal content
    return (
      <Box
        sx={{
          bgcolor: '#1a1a1a',
          color: '#fff',
          pt: 8,
          pb: 4,
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: '#888',
                fontSize: '0.75rem',
              }}
            >
              © 2025 AIedulog
            </Typography>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        bgcolor: '#1a1a1a',
        color: '#fff',
        pt: 8,
        pb: 4,
      }}
    >
      <Container maxWidth="xl">
        {footerData.categories.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)', // Mobile: 2 columns
                sm: 'repeat(2, 1fr)', // Tablet: 2 columns  
                md: 'repeat(4, 1fr)', // Desktop: 4 columns
                lg: 'repeat(4, 1fr)', // Large: 4 columns
              },
              gap: 3, // Same as hero section
            }}
          >
            {footerData.categories
              .filter((category) => category.is_active)
              .sort((a, b) => a.display_order - b.display_order)
              .map((category) => (
                <Box key={category.id}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                      fontSize: '0.875rem',
                    }}
                  >
                    {getTitle(category)}
                  </Typography>
                  <Stack spacing={1.5}>
                    {category.links
                      ?.filter((link) => link.is_active)
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((link) => (
                        <MuiLink
                          key={link.id}
                          href={link.url}
                          target={link.is_external ? '_blank' : '_self'}
                          rel={link.is_external ? 'noopener noreferrer' : undefined}
                          underline="none"
                          sx={{
                            color: '#888',
                            fontSize: '0.875rem',
                            '&:hover': { color: '#fff' },
                          }}
                        >
                          {getLinkTitle(link)}
                        </MuiLink>
                      ))}
                  </Stack>
                </Box>
              ))}
          </Box>
        )}

        {/* Bottom bar */}
        <Divider sx={{ borderColor: '#333', my: 4 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#888',
              fontSize: '0.75rem',
            }}
          >
            {getSetting('copyright') || '© 2025 AIedulog'}
          </Typography>

          {/* Social links */}
          {footerData.socialLinks.length > 0 && (
            <Stack direction="row" spacing={2}>
              {footerData.socialLinks
                .filter((social) => social.is_active)
                .sort((a, b) => a.display_order - b.display_order)
                .map((social) => renderSocialIcon(social))}
            </Stack>
          )}
        </Box>

      </Container>
    </Box>
  )
}