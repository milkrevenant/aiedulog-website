'use client'

import {
  Box,
  Container,
  Typography,
  Stack,
  useTheme,
  alpha,
  Avatar,
  IconButton,
  Divider,
  Paper,
  useMediaQuery
} from '@mui/material'
import { Twitter, GitHub, LinkedIn } from '@mui/icons-material'

export default function AboutUs() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const teamMembers = [
    {
      name: "Dario Amodei",
      role: "CEO",
      description: "Leading AIedulog's mission to develop AI safety and beneficial AI systems",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    },
    {
      name: "Daniela Amodei",
      role: "President",
      description: "Overseeing operations and strategic initiatives for AI research",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    },
    {
      name: "Chris Olah",
      role: "Research Lead",
      description: "Pioneering interpretability research and neural network understanding",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    },
    {
      name: "Sam McCandlish",
      role: "Technical Lead",
      description: "Building scalable AI infrastructure and model training systems",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150"
    }
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          py: { xs: 6, sm: 8, md: 12 },
          px: 2
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              About AIedulog
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary"
              sx={{ 
                maxWidth: 800,
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                lineHeight: 1.8
              }}
            >
              Building safe, beneficial AI systems that understand and respect human values
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Mission Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={6}>
          <Box>
            <Typography 
              variant="h2" 
              sx={{ 
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                fontWeight: 600,
                mb: 3,
                textAlign: 'center'
              }}
            >
              Our Mission
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.125rem' },
                lineHeight: 1.8,
                textAlign: 'center',
                maxWidth: 800,
                mx: 'auto',
                color: 'text.secondary'
              }}
            >
              AIedulog is an AI safety company. We develop AI systems that are safe, beneficial, and understandable. 
              Our research focuses on making AI more interpretable, controllable, and aligned with human intentions.
            </Typography>
          </Box>

          {/* Values Section */}
          <Box>
            <Typography 
              variant="h2" 
              sx={{ 
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                fontWeight: 600,
                mb: 4,
                textAlign: 'center'
              }}
            >
              Our Values
            </Typography>
            <Stack spacing={3}>
              {[
                { title: 'Safety First', description: 'We prioritize the development of AI systems that are safe and beneficial to humanity.' },
                { title: 'Transparency', description: 'We believe in open research and clear communication about AI capabilities and limitations.' },
                { title: 'Responsibility', description: 'We take seriously our role in shaping the future of AI technology.' }
              ].map((value, index) => (
                <Paper 
                  key={index}
                  elevation={1}
                  sx={{ 
                    p: 3,
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {value.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {value.description}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Divider sx={{ opacity: 0.1 }} />

      {/* Team Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography 
          variant="h2" 
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            fontWeight: 600,
            mb: 6,
            textAlign: 'center'
          }}
        >
          Our Team
        </Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3
        }}>
          {teamMembers.map((member, index) => (
            <Paper
              key={index}
              elevation={1}
              sx={{
                p: 3,
                textAlign: 'center',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                }
              }}
            >
              <Avatar
                src={member.avatar}
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mx: 'auto',
                  mb: 2,
                  border: `3px solid ${theme.palette.primary.light}`
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {member.name}
              </Typography>
              <Typography 
                variant="body2" 
                color="primary.main"
                sx={{ mb: 2, fontWeight: 500 }}
              >
                {member.role}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {member.description}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                <IconButton size="small" color="primary">
                  <Twitter fontSize="small" />
                </IconButton>
                <IconButton size="small" color="primary">
                  <LinkedIn fontSize="small" />
                </IconButton>
                <IconButton size="small" color="primary">
                  <GitHub fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Container>

      <Divider sx={{ opacity: 0.1 }} />

      {/* Contact Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Typography 
            variant="h2" 
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              fontWeight: 600
            }}
          >
            Get in Touch
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
            Interested in our work? Want to collaborate? We'd love to hear from you.
          </Typography>
          <Stack direction="row" spacing={2}>
            <IconButton 
              color="primary" 
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <Twitter />
            </IconButton>
            <IconButton 
              color="primary"
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <GitHub />
            </IconButton>
            <IconButton 
              color="primary"
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <LinkedIn />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}