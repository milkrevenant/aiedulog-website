'use client'

import {
  Box,
  Container,
  Typography,
  Grid,
  Stack,
  useTheme,
  alpha,
  Avatar,
  IconButton,
  Divider,
  Paper,
  Button,
  useMediaQuery
} from '@mui/material'
import { 
  ArrowForward,
  School,
  People,
  Lightbulb,
  Groups,
  Email,
  LinkedIn,
  Twitter,
  ArrowOutward
} from '@mui/icons-material'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function AboutUs() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))

  const teamMembers = [
    {
      name: '김교육',
      role: 'CEO',
      department: 'Research',
      bio: 'AI 교육 혁신을 선도하며, 미래 교육의 방향을 연구합니다.',
      image: null
    },
    {
      name: '이에듀',
      role: 'CTO',
      department: 'Research',
      bio: '에듀테크 도구를 활용한 창의적 수업 방법을 개발합니다.',
      image: null
    },
    {
      name: '박테크',
      role: 'Research Lead',
      department: 'Policy',
      bio: '교육 공학 연구를 통해 효과적인 학습 방법을 탐구합니다.',
      image: null
    },
    {
      name: '정미래',
      role: 'Product Manager',
      department: 'Product',
      bio: '혁신적인 교육 프로그램을 기획하고 실행합니다.',
      image: null
    },
    {
      name: '최디지털',
      role: 'Engineering Lead',
      department: 'Operations',
      bio: '디지털 플랫폼과 교육 콘텐츠를 관리합니다.',
      image: null
    },
    {
      name: '강소통',
      role: 'Marketing Lead',
      department: 'Operations',
      bio: '연구회 활동을 알리고 교사들과의 소통을 담당합니다.',
      image: null
    }
  ]

  const values = [
    {
      number: '01',
      title: 'Act for the global good.',
      description: 'We strive to make decisions that maximize positive outcomes for humanity in the long run.'
    },
    {
      number: '02',
      title: 'Hold light and shade.',
      description: 'AI has the potential to pose unprecedented risks to humanity. We need light to realize the good outcomes.'
    },
    {
      number: '03',
      title: 'Be good to our users.',
      description: 'At Anthropic, we define "users" broadly. Users are not just those who pay.'
    },
    {
      number: '04',
      title: 'Ignite a race to the top on safety.',
      description: 'As a safety-first company, we believe that building reliable AI systems is crucial.'
    }
  ]

  return (
    <>
      <Navbar />
      
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#FFFFFF',
        pt: { xs: 10, md: 12 }
      }}>
        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
          <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Typography 
              variant="h1" 
              sx={{
                fontSize: {
                  xs: 'clamp(2rem, 7vw, 3rem)',
                  sm: 'clamp(2.5rem, 6vw, 3.5rem)',
                  md: 'clamp(3rem, 5vw, 4rem)',
                  lg: '4.5rem'
                },
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                mb: 3,
                textAlign: { xs: 'left', md: 'center' }
              }}
            >
              Making AI systems you can rely on
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                lineHeight: 1.6,
                color: 'text.secondary',
                textAlign: { xs: 'left', md: 'center' },
                maxWidth: '700px',
                mx: 'auto',
                mb: 4
              }}
            >
              We believe AI will have a vast impact on the world. Anthropic is dedicated to building systems that people can rely on and generating research about the opportunities and risks of AI.
            </Typography>
            <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
              <Button
                variant="contained"
                sx={{
                  bgcolor: 'black',
                  color: 'white',
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: alpha('#000', 0.9)
                  }
                }}
              >
                Careers
              </Button>
            </Box>
          </Box>
        </Container>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Our Purpose Section - Desktop: 2-column, Mobile: 1-column */}
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Grid container spacing={{ xs: 4, sm: 6, md: 8 }}>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                sx={{
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  fontWeight: 500,
                  mb: { xs: 3, md: 0 }
                }}
              >
                Our Purpose
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                  lineHeight: 1.7,
                  color: 'text.secondary',
                  mb: 3
                }}
              >
                We believe AI will have a vast impact on the world. Anthropic is dedicated to building systems that people can rely on and generating research about the opportunities and risks of AI.
              </Typography>
              
              <Stack spacing={3}>
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: { xs: '1rem', md: '1.125rem' },
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    We Build Safer Systems
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      lineHeight: 1.7,
                      color: 'text.secondary'
                    }}
                  >
                    We aim to build frontier AI systems that are reliable, interpretable, and steerable.
                  </Typography>
                </Box>

                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: { xs: '1rem', md: '1.125rem' },
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    Safety is a Science
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      lineHeight: 1.7,
                      color: 'text.secondary'
                    }}
                  >
                    We conduct frontier research, develop new tools and methods for AI safety.
                  </Typography>
                </Box>

                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: { xs: '1rem', md: '1.125rem' },
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    Interdisciplinary
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      lineHeight: 1.7,
                      color: 'text.secondary'
                    }}
                  >
                    Anthropic is a collaborative team of researchers, engineers, policy experts, business leaders and operators.
                  </Typography>
                </Box>

                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: { xs: '1rem', md: '1.125rem' },
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    AI Companies are One Piece of a Big Puzzle
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      lineHeight: 1.7,
                      color: 'text.secondary'
                    }}
                  >
                    AI has the potential to fundamentally change how the world works.
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Container>

        <Divider sx={{ opacity: 0.1 }} />

        {/* The Team Section */}
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Typography 
            variant="h2" 
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              fontWeight: 500,
              mb: 3
            }}
          >
            The Team
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              lineHeight: 1.7,
              color: 'text.secondary',
              mb: 5,
              maxWidth: '800px'
            }}
          >
            We're a team of researchers, engineers, policy experts and operational leaders, with experience spanning a variety of disciplines, all working together to build reliable and understandable AI systems.
          </Typography>

          {/* Team Categories - Desktop: 2x2 grid, Tablet/Mobile: vertical */}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  height: { xs: '200px', sm: '250px', md: '300px' },
                  bgcolor: '#f5f5f5',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <Box sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Research
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    We conduct frontier AI research across a variety of modalities, and explore novel and emerging safety research.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  height: { xs: '200px', sm: '250px', md: '300px' },
                  bgcolor: '#f5f5f5',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <Box sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Policy
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    We think about the impacts of our work and strive to communicate what we're seeing at the frontier.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  height: { xs: '200px', sm: '250px', md: '300px' },
                  bgcolor: '#f5f5f5',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <Box sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Product
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    We emphasize research into tangible, practical tools like Claude, and strive to make them broadly available.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  height: { xs: '200px', sm: '250px', md: '300px' },
                  bgcolor: '#f5f5f5',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <Box sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Operations
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Our People, Finance, Legal, and recruiting teams are the foundation upon which Anthropic sits.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Divider sx={{ opacity: 0.1 }} />

        {/* What we value Section */}
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Grid container spacing={{ xs: 4, sm: 6, md: 8 }}>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                sx={{
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  fontWeight: 500,
                  mb: { xs: 3, md: 0 }
                }}
              >
                What we value<br />
                and how we act
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                  lineHeight: 1.7,
                  color: 'text.secondary',
                  mb: 4
                }}
              >
                Every day, we make critical decisions that inform our ability to achieve our mission. Shaping the future of AI and, in turn, the future of our world is a responsibility and a privilege. Our values guide how we work together, the decisions we make, and ultimately how we show up for each other and work toward our mission.
              </Typography>

              {/* Values Grid - Desktop: 2x2, Mobile: 1 column */}
              <Grid container spacing={3}>
                {values.map((value, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{ mb: { xs: 3, md: 0 } }}>
                      <Typography 
                        sx={{ 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          mb: 1,
                          color: 'text.secondary'
                        }}
                      >
                        {value.number}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontSize: { xs: '1rem', md: '1.125rem' },
                          fontWeight: 600,
                          mb: 1
                        }}
                      >
                        {value.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: { xs: '0.875rem', md: '0.9375rem' },
                          lineHeight: 1.7,
                          color: 'text.secondary'
                        }}
                      >
                        {value.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Additional Sections */}
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Grid container spacing={{ xs: 4, sm: 6, md: 8 }}>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                sx={{
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  fontWeight: 500,
                  mb: { xs: 3, md: 0 }
                }}
              >
                AI for the global good.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                  lineHeight: 1.7,
                  color: 'text.secondary',
                  mb: 3
                }}
              >
                We strive to make decisions that maximize positive outcomes for humanity in the long run. This means maintaining a nuanced understanding of the complex tradeoffs we face and avoiding value lock-in.
              </Typography>
            </Grid>
          </Grid>
        </Container>

        <Divider sx={{ opacity: 0.1 }} />

        {/* More sections following the same pattern... */}
        
        {/* CTA Section */}
        <Box sx={{ 
          bgcolor: 'black',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center'
        }}>
          <Container maxWidth="md">
            <Typography 
              variant="h2" 
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 400,
                mb: 4,
                lineHeight: 1.2
              }}
            >
              Want to help us build<br />
              the future of safe AI?
            </Typography>
            <Button
              variant="contained"
              sx={{
                bgcolor: 'white',
                color: 'black',
                textTransform: 'none',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: alpha('#fff', 0.9)
                }
              }}
            >
              Join us
            </Button>
          </Container>
        </Box>
      </Box>
    </>
  )
}