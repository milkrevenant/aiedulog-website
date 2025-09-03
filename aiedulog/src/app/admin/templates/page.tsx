'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import {
  Box,
  Container,
  Typography,
  
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Badge,
  Tooltip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Rating,
  AvatarGroup,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Dashboard,
  FileCopy,
  Add,
  Preview,
  GetApp,
  Star,
  StarBorder,
  Edit,
  Delete,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Business,
  School,
  LocalHospital,
  Computer,
  Campaign,
  GridOn,
  BarChart,
  Timeline,
  TextFields,
  Image,
  VideoCall,
  QuestionAnswer,
  Help,
  CheckCircle,
  CloudUpload,
  Share,
  ContentCopy,
  Visibility,
  Download,
} from '@mui/icons-material'

// Template categories configuration
const TEMPLATE_CATEGORIES = {
  industry: {
    name: 'Industry Templates',
    icon: <Business />,
    color: '#1976d2',
    subcategories: {
      education: { name: 'Education', icon: <School />, color: '#2e7d32' },
      business: { name: 'Business', icon: <Business />, color: '#1976d2' },
      tech: { name: 'Technology', icon: <Computer />, color: '#7b1fa2' },
      healthcare: { name: 'Healthcare', icon: <LocalHospital />, color: '#c62828' },
    }
  },
  section: {
    name: 'Section Templates',
    icon: <ViewModule />,
    color: '#7c4dff',
    subcategories: {
      hero: { name: 'Hero Variants', icon: <Campaign />, color: '#1976d2' },
      features: { name: 'Features', icon: <GridOn />, color: '#7c4dff' },
      about: { name: 'About Pages', icon: <TextFields />, color: '#546e7a' },
    }
  },
  block: {
    name: 'Block Templates',
    icon: <GridOn />,
    color: '#00c853',
    subcategories: {
      hero: { name: 'Hero Blocks', icon: <Campaign />, color: '#1976d2' },
      stats: { name: 'Statistics', icon: <BarChart />, color: '#00c853' },
      timeline: { name: 'Timeline', icon: <Timeline />, color: '#ff6f00' },
      gallery: { name: 'Gallery', icon: <Image />, color: '#e91e63' },
      testimonials: { name: 'Testimonials', icon: <QuestionAnswer />, color: '#9c27b0' },
      faq: { name: 'FAQ', icon: <Help />, color: '#607d8b' },
    }
  },
  page: {
    name: 'Complete Pages',
    icon: <FileCopy />,
    color: '#ff9800',
    subcategories: {
      landing: { name: 'Landing Pages', icon: <Campaign />, color: '#ff9800' },
      about: { name: 'About Pages', icon: <TextFields />, color: '#546e7a' },
      portfolio: { name: 'Portfolios', icon: <ViewModule />, color: '#7c4dff' },
    }
  }
}

interface ContentTemplate {
  id: string
  template_key: string
  name: { ko: string; en: string }
  description?: { ko: string; en: string }
  template_type: 'section' | 'block' | 'page'
  category: string
  template_data: any
  preview_image_url?: string
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  // Virtual fields for UI
  rating?: number
  tags?: string[]
  author_name?: string
  is_featured?: boolean
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      <AnimatePresence mode="wait">
        {value === index && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ py: 3 }}>{children}</Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TemplateLibrary() {
  // State management
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ContentTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [tabValue, setTabValue] = useState(0)
  
  // Dialog states
  const [previewDialog, setPreviewDialog] = useState(false)
  const [createDialog, setCreateDialog] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(false)
  
  const router = useRouter()

  // Sample template data with enterprise features
  const sampleTemplates: ContentTemplate[] = [
    {
      id: '1',
      template_key: 'edu_hero_modern',
      name: { ko: '모던 교육 히어로', en: 'Modern Education Hero' },
      description: { ko: '교육 기관을 위한 모던한 히어로 섹션', en: 'Modern hero section for educational institutions' },
      template_type: 'block',
      category: 'education',
      template_data: {
        type: 'hero',
        content: {
          title: { ko: '미래를 만드는 교육', en: 'Education for the Future' },
          subtitle: { ko: '혁신적인 AI 교육으로 미래를 준비하세요', en: 'Prepare for the future with innovative AI education' },
          background_type: 'gradient',
          background_gradient: { start: '#667eea', end: '#764ba2' }
        }
      },
      preview_image_url: '/api/placeholder/400/300',
      is_public: true,
      usage_count: 156,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      rating: 4.8,
      tags: ['education', 'modern', 'gradient'],
      author_name: 'Design Team',
      is_featured: true,
      difficulty: 'beginner'
    },
    {
      id: '2',
      template_key: 'business_features_3col',
      name: { ko: '비즈니스 3열 특징', en: 'Business 3-Column Features' },
      description: { ko: '비즈니스를 위한 3열 특징 그리드', en: '3-column feature grid for business' },
      template_type: 'block',
      category: 'business',
      template_data: {
        type: 'feature_grid',
        content: {
          columns: 3,
          items: [
            { title: { ko: '효율성', en: 'Efficiency' }, description: { ko: '업무 효율성 증대', en: 'Increased work efficiency' } },
            { title: { ko: '혁신', en: 'Innovation' }, description: { ko: '지속적인 혁신', en: 'Continuous innovation' } },
            { title: { ko: '성장', en: 'Growth' }, description: { ko: '지속 가능한 성장', en: 'Sustainable growth' } }
          ]
        }
      },
      preview_image_url: '/api/placeholder/400/300',
      is_public: true,
      usage_count: 89,
      created_at: '2024-01-16T14:30:00Z',
      updated_at: '2024-01-16T14:30:00Z',
      rating: 4.6,
      tags: ['business', 'features', 'professional'],
      author_name: 'Business Team',
      is_featured: false,
      difficulty: 'intermediate'
    },
    {
      id: '3',
      template_key: 'tech_stats_animated',
      name: { ko: '테크 애니메이션 통계', en: 'Tech Animated Stats' },
      description: { ko: '기술 회사를 위한 애니메이션 통계', en: 'Animated statistics for tech companies' },
      template_type: 'block',
      category: 'tech',
      template_data: {
        type: 'stats',
        content: {
          items: [
            { number: 10000, label: { ko: '활성 사용자', en: 'Active Users' }, suffix: '+' },
            { number: 99, label: { ko: '가동 시간', en: 'Uptime' }, suffix: '%' },
            { number: 50, label: { ko: '국가', en: 'Countries' }, suffix: '+' }
          ]
        }
      },
      preview_image_url: '/api/placeholder/400/300',
      is_public: true,
      usage_count: 234,
      created_at: '2024-01-17T09:15:00Z',
      updated_at: '2024-01-17T09:15:00Z',
      rating: 4.9,
      tags: ['technology', 'stats', 'animated'],
      author_name: 'Tech Team',
      is_featured: true,
      difficulty: 'advanced'
    },
    {
      id: '4',
      template_key: 'healthcare_timeline',
      name: { ko: '의료진 연혁', en: 'Healthcare Timeline' },
      description: { ko: '의료 기관의 발전 과정을 보여주는 타임라인', en: 'Timeline showing healthcare institution development' },
      template_type: 'block',
      category: 'healthcare',
      template_data: {
        type: 'timeline',
        content: {
          orientation: 'vertical',
          items: [
            { date: '2020', title: { ko: '설립', en: 'Establishment' }, description: { ko: '병원 설립', en: 'Hospital establishment' } },
            { date: '2022', title: { ko: '확장', en: 'Expansion' }, description: { ko: '새 병동 추가', en: 'New wing added' } },
            { date: '2024', title: { ko: 'AI 도입', en: 'AI Integration' }, description: { ko: 'AI 진단 시스템 도입', en: 'AI diagnostic system introduced' } }
          ]
        }
      },
      preview_image_url: '/api/placeholder/400/300',
      is_public: true,
      usage_count: 67,
      created_at: '2024-01-18T16:45:00Z',
      updated_at: '2024-01-18T16:45:00Z',
      rating: 4.7,
      tags: ['healthcare', 'timeline', 'medical'],
      author_name: 'Healthcare Team',
      is_featured: false,
      difficulty: 'intermediate'
    },
    {
      id: '5',
      template_key: 'complete_landing_edu',
      name: { ko: '완전한 교육 랜딩페이지', en: 'Complete Education Landing Page' },
      description: { ko: '교육 기관을 위한 완전한 랜딩페이지 템플릿', en: 'Complete landing page template for educational institutions' },
      template_type: 'page',
      category: 'education',
      template_data: {
        sections: [
          { type: 'hero', title: 'Hero Section' },
          { type: 'feature_grid', title: 'Features' },
          { type: 'stats', title: 'Statistics' },
          { type: 'testimonial', title: 'Testimonials' },
          { type: 'cta', title: 'Call to Action' }
        ]
      },
      preview_image_url: '/api/placeholder/400/300',
      is_public: true,
      usage_count: 45,
      created_at: '2024-01-19T11:20:00Z',
      updated_at: '2024-01-19T11:20:00Z',
      rating: 4.5,
      tags: ['education', 'landing page', 'complete'],
      author_name: 'Design Team',
      is_featured: true,
      difficulty: 'advanced'
    }
  ]

  useEffect(() => {
    // Simulate loading templates
    setTimeout(() => {
      setTemplates(sampleTemplates)
      setFilteredTemplates(sampleTemplates)
      setLoading(false)
    }, 1000)
  }, [])

  // Filter templates based on search and category
  useEffect(() => {
    let filtered = templates

    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.name.ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.ko?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    setFilteredTemplates(filtered)
  }, [templates, searchTerm, selectedCategory, selectedSubcategory])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleUseTemplate = async (template: ContentTemplate) => {
    // Implementation for using template
    console.log('Using template:', template.template_key)
    // This would integrate with the main content management system
  }

  const handlePreviewTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template)
    setPreviewDialog(true)
  }

  const getFeaturedTemplates = () => {
    return filteredTemplates.filter(t => t.is_featured).slice(0, 6)
  }

  const getPopularTemplates = () => {
    return filteredTemplates
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 8)
  }

  const getRecentTemplates = () => {
    return filteredTemplates
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
  }

  const renderTemplateCard = (template: ContentTemplate, variant: 'featured' | 'standard' = 'standard') => (
    <Grid
      key={template.id}
      size={{
        xs: 12,
        sm: 6,
        md: variant === 'featured' ? 6 : 4,
        lg: variant === 'featured' ? 4 : 3
      }}>
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card 
          sx={{ 
            height: '100%',
            cursor: 'pointer',
            position: 'relative',
            boxShadow: variant === 'featured' ? '0 8px 32px rgba(0,0,0,0.12)' : undefined,
            '&:hover': {
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }
          }}
        >
          {template.preview_image_url && (
            <CardMedia
              component="img"
              height={variant === 'featured' ? 200 : 160}
              image={template.preview_image_url}
              alt={template.name.ko}
              sx={{ backgroundColor: 'grey.100' }}
            />
          )}

          {template.is_featured && (
            <Chip
              icon={<Star />}
              label="Featured"
              color="primary"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 1,
              }}
            />
          )}

          <Badge
            badgeContent={template.usage_count}
            color="secondary"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              '& .MuiBadge-badge': {
                fontSize: '0.7rem',
              }
            }}
          >
            <Chip
              label={template.template_type}
              size="small"
              variant="outlined"
              sx={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
            />
          </Badge>

          <CardContent sx={{ pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                {template.name.ko}
              </Typography>
              <Rating value={template.rating || 0} size="small" readOnly />
            </Stack>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {template.description?.ko}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
              {template.tags?.slice(0, 3).map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                {template.author_name?.charAt(0) || 'T'}
              </Avatar>
              <Typography variant="caption" color="text.secondary" noWrap>
                {template.author_name}
              </Typography>
              
              <Box sx={{ flex: 1 }} />
              
              <Chip
                label={template.difficulty}
                size="small"
                color={
                  template.difficulty === 'beginner' ? 'success' :
                  template.difficulty === 'intermediate' ? 'warning' : 'error'
                }
                variant="outlined"
              />
            </Stack>
          </CardContent>

          <CardActions sx={{ p: 2, pt: 0 }}>
            <Button 
              size="small" 
              onClick={() => handlePreviewTemplate(template)}
              startIcon={<Preview />}
            >
              Preview
            </Button>
            <Button 
              size="small" 
              onClick={() => handleUseTemplate(template)}
              startIcon={<Download />}
              color="primary"
              variant="contained"
            >
              Use Template
            </Button>
            <Box sx={{ flex: 1 }} />
            <IconButton size="small">
              <StarBorder />
            </IconButton>
            <IconButton size="small">
              <Share />
            </IconButton>
          </CardActions>
        </Card>
      </motion.div>
    </Grid>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading template library...
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link href="/admin" underline="hover" color="inherit">
                <Dashboard sx={{ mr: 0.5 }} fontSize="inherit" />
                Admin
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <FileCopy sx={{ mr: 0.5 }} fontSize="inherit" />
                Template Library
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  Enterprise Template Library
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Professional templates for rapid content creation and consistent design
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={() => setUploadDialog(true)}
                >
                  Upload Template
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialog(true)}
                  sx={{ 
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                  }}
                >
                  Create Template
                </Button>
              </Stack>
            </Stack>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
                <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {templates.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Total Templates
                  </Typography>
                </Paper>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
                <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {templates.filter(t => t.is_featured).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Featured
                  </Typography>
                </Paper>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
                <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {Object.keys(TEMPLATE_CATEGORIES).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Categories
                  </Typography>
                </Paper>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 3
                }}>
                <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {templates.reduce((sum, t) => sum + t.usage_count, 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    Total Uses
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </motion.div>

        {/* Search and Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ flex: 1, minWidth: 200 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {Object.entries(TEMPLATE_CATEGORIES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {config.icon}
                      <span>{config.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1}>
              <IconButton 
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <ViewModule />
              </IconButton>
              <IconButton 
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ViewList />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>

        {/* Main Content */}
        <Paper sx={{ width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              px: 3,
              '& .MuiTab-root': {
                minHeight: '64px',
                fontSize: '0.95rem',
                fontWeight: 500,
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<Star />} label="Featured" iconPosition="start" />
            <Tab icon={<BarChart />} label="Popular" iconPosition="start" />
            <Tab icon={<ViewModule />} label="All Templates" iconPosition="start" />
            <Tab icon={<Add />} label="Recent" iconPosition="start" />
          </Tabs>

          {/* Featured Templates */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star color="primary" />
                Featured Templates
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Hand-picked templates that represent the best of our collection
              </Typography>
              
              <Grid container spacing={3}>
                {getFeaturedTemplates().map(template => renderTemplateCard(template, 'featured'))}
              </Grid>
              
              {getFeaturedTemplates().length === 0 && (
                <Alert severity="info">
                  No featured templates available at the moment.
                </Alert>
              )}
            </Box>
          </TabPanel>

          {/* Popular Templates */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart color="primary" />
                Most Popular
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Templates most frequently used by the community
              </Typography>
              
              <Grid container spacing={3}>
                {getPopularTemplates().map(template => renderTemplateCard(template))}
              </Grid>
            </Box>
          </TabPanel>

          {/* All Templates */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewModule color="primary" />
                  All Templates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredTemplates.length} templates found
                </Typography>
              </Stack>
              
              <Grid container spacing={3}>
                {filteredTemplates.map(template => renderTemplateCard(template))}
              </Grid>
              
              {filteredTemplates.length === 0 && (
                <Alert severity="info">
                  No templates match your current filters.
                </Alert>
              )}
            </Box>
          </TabPanel>

          {/* Recent Templates */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Add color="primary" />
                Recently Added
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Latest templates added to the library
              </Typography>
              
              <Grid container spacing={3}>
                {getRecentTemplates().map(template => renderTemplateCard(template))}
              </Grid>
            </Box>
          </TabPanel>
        </Paper>

        {/* Template Preview Dialog */}
        <Dialog 
          open={previewDialog} 
          onClose={() => setPreviewDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Preview />
              <Box>
                <Typography variant="h6">
                  {selectedTemplate?.name.ko}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Template Preview
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {selectedTemplate && (
              <Box>
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <Chip label={selectedTemplate.template_type} color="primary" />
                  <Chip label={selectedTemplate.category} variant="outlined" />
                  <Chip 
                    label={`Used ${selectedTemplate.usage_count} times`} 
                    variant="outlined" 
                  />
                  <Rating value={selectedTemplate.rating} size="small" readOnly />
                </Stack>
                
                <Typography variant="body1" sx={{ mb: 3 }}>
                  {selectedTemplate.description?.ko}
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  Template preview will show the actual rendered content here.
                  This would include live preview of the template with sample data.
                </Alert>
                
                {selectedTemplate.preview_image_url && (
                  <CardMedia
                    component="img"
                    image={selectedTemplate.preview_image_url}
                    alt="Template Preview"
                    sx={{ borderRadius: 1, maxHeight: 400 }}
                  />
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialog(false)}>
              Close
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Download />}
              onClick={() => {
                if (selectedTemplate) {
                  handleUseTemplate(selectedTemplate)
                }
                setPreviewDialog(false)
              }}
            >
              Use This Template
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button */}
        <SpeedDial
          ariaLabel="Template Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<Add />}
            tooltipTitle="Create Template"
            onClick={() => setCreateDialog(true)}
          />
          <SpeedDialAction
            icon={<CloudUpload />}
            tooltipTitle="Upload Template"
            onClick={() => setUploadDialog(true)}
          />
          <SpeedDialAction
            icon={<Download />}
            tooltipTitle="Download Templates"
          />
        </SpeedDial>
      </Container>
    </>
  );
}

export default function TemplateLibraryPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <TemplateLibrary />
    </AuthGuard>
  )
}