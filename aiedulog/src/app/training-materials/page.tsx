'use client'

import { useState, useEffect } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Stack,
  Grid,
  useTheme,
  alpha,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  useMediaQuery,
  Fab,
  Tooltip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel
} from '@mui/material'
import { 
  ArrowBack,
  ExpandMore,
  ExpandLess,
  School,
  AutoAwesome,
  Code,
  CalendarToday,
  Person,
  Add as AddIcon,
  Edit as EditIcon,
  PictureAsPdf,
  Slideshow,
  VideoLibrary,
  Link as LinkIcon,
  FilterList,
  Sort,
  GridView,
  ViewList
} from '@mui/icons-material'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth/hooks'
import MaterialModal, { Material } from '@/components/training/MaterialModal'
import { Tabs, Tab, FormControl, Select, MenuItem, InputLabel } from '@mui/material'

// Types
// Types moved to component import

const CATEGORY_LABELS: Record<string, string> = {
  all: '전체',
  elementary: '초등',
  middle: '중등',
  high: '고등',
  etc: '기타'
}

export default function TrainingMaterialsPage() {
  const theme = useTheme()
  const { user } = useAuth()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  
  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [orderBy, setOrderBy] = useState<keyof Material>('training_date')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  // Derived state
  const filteredMaterials = materials
    .filter(m => selectedCategory === 'all' || m.category === selectedCategory)
    .sort((a, b) => {
      if (viewMode === 'grid') {
        const dateA = new Date(a.training_date).getTime()
        const dateB = new Date(b.training_date).getTime()
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
      } else {
        // Table sorting
        const aValue = a[orderBy] || ''
        const bValue = b[orderBy] || ''
        
        if (bValue < aValue) {
          return order === 'desc' ? -1 : 1
        }
        if (bValue > aValue) {
          return order === 'desc' ? 1 : -1
        }
        return 0
      }
    })

  const handleRequestSort = (property: keyof Material) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/training-materials')
      if (!response.ok) throw new Error('Failed to fetch materials')
      
      const data = await response.json()
      if (data && Array.isArray(data) && data.length > 0) {
        setMaterials(data)
      } else {
        // Fallback to mock data if API returns empty (or for demo purposes)
        throw new Error('No data returned')
      }
    } catch (error) {
      console.warn('Using mock data due to API error or empty result:', error)
      setMaterials([
        {
          id: 'geumcheon-2025-08',
          title: '금천중학교 연수자료 (2025-08)',
          subtitle: '곽수창 선생님의 금천중학교 연수 자료',
          description: '2025년 8월 금천중학교에서 진행된 연수 자료입니다. 에듀테크 도구 활용 실습과 사례 공유를 중심으로 구성되어 있습니다.',
          type: 'canva',
          file_url: 'https://www.canva.com/design/DAGy6ovsOEo/GD8BXvAEFuApT4T3W6BpOQ/view',
          tags: ['EdTech', 'Practice', 'Training'],
          category: 'middle',
          training_date: '2025-08-20',
          instructor: '곽수창'
        },
        {
          id: 'principals-2025-11',
          title: '교장단 연수자료 (2025-11)',
          subtitle: '곽수창 선생님의 교장단 연수 자료',
          description: '2025년 11월 교장단 연수에서 발표된 자료입니다. AI 디지털 교과서와 에듀테크 활용 방안에 대한 내용을 담고 있습니다.',
          type: 'canva',
          file_url: 'https://www.canva.com/design/DAG5AOyhXxw/FlVCpe-DeHUO008Yh6e3xw/view',
          tags: ['Leadership', 'Future Education', 'Training'],
          category: 'etc',
          training_date: '2025-11-28',
          instructor: '곽수창'
        },
        {
          id: 'mcp',
          title: '미래터 연수자료 (2025-10)',
          subtitle: '곽수창 선생님의 미래터 연수 자료',
          description: '미래 교육 환경 구축과 AI 활용 수업에 대한 심도 있는 연수 자료입니다. Canva 프레젠테이션을 통해 생생한 내용을 확인하세요.',
          type: 'canva',
          file_url: 'https://www.canva.com/design/DAGzU4rYR1M/YvsDdAICHDkPY0tm_RXLAQ/view',
          tags: ['AI', 'Future Education', 'Training'],
          category: 'etc',
          training_date: '2025-10-20',
          instructor: '곽수창'
        },
        {
          id: 'cli',
          title: '2025년 하반기: CLI 활용 자동채점',
          subtitle: 'Command Line Interface 기반 평가 시스템',
          description: 'CLI 도구를 활용하여 프로그래밍 과제를 자동으로 채점하고 피드백을 제공하는 시스템을 구축하는 방법을 배웁니다.',
          type: 'link',
          tags: ['DevOps', 'Automation', 'Education'],
          category: 'high',
          training_date: '2025-11-15',
          instructor: '김철수'
        },
        {
          id: 'guide',
          title: '에듀테크 연구회 활동 가이드',
          subtitle: '신규 회원을 위한 온보딩 자료',
          description: '연구회의 비전, 미션, 그리고 연간 활동 계획에 대한 상세한 안내를 담고 있습니다.',
          type: 'link',
          tags: ['Onboarding', 'Guide'],
          category: 'etc',
          training_date: '2025-03-01',
          instructor: '운영진'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (material: Material) => {
    try {
      const method = material.id ? 'PUT' : 'POST'
      const response = await fetch('/api/training-materials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material)
      })

      if (!response.ok) throw new Error('Failed to save')
      
      // Refresh list
      await fetchMaterials()
      setModalOpen(false)
      setEditingMaterial(null)
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save material')
    }
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditingMaterial(null)
    setModalOpen(true)
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'canva': return <AutoAwesome sx={{ fontSize: 40, color: '#2E86AB' }} />
      case 'google_slides': return <Slideshow sx={{ fontSize: 40, color: '#F4B400' }} />
      case 'pptx': return <Slideshow sx={{ fontSize: 40, color: '#D04423' }} /> // PowerPoint color
      case 'pdf': return <PictureAsPdf sx={{ fontSize: 40, color: '#F40F02' }} />
      case 'video': return <VideoLibrary sx={{ fontSize: 40, color: '#FF0000' }} />
      default: return <LinkIcon sx={{ fontSize: 40, color: '#5f6368' }} />
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'canva': return '#E3F2FD'
      case 'google_slides': return '#FFF8E1'
      case 'pptx': return '#FBE9E7'
      case 'pdf': return '#FFEBEE'
      default: return '#F5F5F5'
    }
  }

  const renderEmbed = (material: Material) => {
    if (material.type === 'canva') {
      // 1. Use embed_code if available
      if (material.embed_code) {
        return (
          <Box 
            dangerouslySetInnerHTML={{ __html: material.embed_code }} 
            sx={{ 
              width: '100%', 
              '& iframe': {
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }
            }}
          />
        )
      }
      
      // 2. Construct embed from file_url (Smart Link)
      if (material.file_url) {
        const embedUrl = material.file_url.includes('?') 
          ? material.file_url.replace('/view', '/view?embed') 
          : `${material.file_url}?embed`
          
        return (
          <Box sx={{ position: 'relative', pt: '56.25%', height: 0, overflow: 'hidden', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <iframe
              src={embedUrl}
              loading="lazy"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
              allow="fullscreen"
            />
          </Box>
        )
      }
    }

    if (material.type === 'google_slides' && material.file_url) {
      return (
        <Box sx={{ position: 'relative', pt: '56.25%', height: 0, overflow: 'hidden', borderRadius: 2 }}>
          <iframe
            src={material.file_url.replace('/pub?', '/embed?')}
            frameBorder="0"
            width="100%"
            height="100%"
            allowFullScreen={true}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        </Box>
      )
    }

    if ((material.type === 'pptx' || material.type === 'pdf') && material.file_url) {
      // Use Google Docs Viewer for PPTX and PDF
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(material.file_url)}&embedded=true`
      return (
        <Box sx={{ position: 'relative', pt: '56.25%', height: 0, overflow: 'hidden', borderRadius: 2 }}>
          <iframe
            src={viewerUrl}
            frameBorder="0"
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        </Box>
      )
    }

    if (material.type === 'video' && material.file_url) {
       return (
        <Box sx={{ position: 'relative', pt: '56.25%', height: 0, overflow: 'hidden', borderRadius: 2 }}>
          <iframe
            src={material.file_url}
            frameBorder="0"
            width="100%"
            height="100%"
            allowFullScreen={true}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        </Box>
      )
    }

    return (
      <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary">
          미리보기를 지원하지 않는 형식이거나 링크가 없습니다.
        </Typography>
        {material.file_url && (
          <Button 
            variant="contained" 
            href={material.file_url} 
            target="_blank" 
            sx={{ mt: 2 }}
          >
            자료 보러가기
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFCFE' }}>
      <AppHeader />
      
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha('#2E86AB', 0.05)} 0%, ${alpha('#A23B72', 0.05)} 100%)`,
          py: { xs: 6, sm: 8 },
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                color: '#191C20',
              }}
            >
              연수 자료
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                lineHeight: 1.8,
              }}
            >
              전남에듀테크교육연구회의 연수 자료를 확인하고 다운로드할 수 있습니다.
              <br />
              카드를 클릭하여 내용을 펼쳐보세요.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={4}>
            {/* Filter and Sort Controls */}
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={3}
          sx={{ mb: 4 }}
        >
          <Tabs 
            value={selectedCategory} 
            onChange={(_, val) => setSelectedCategory(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              '& .MuiTab-root': { fontWeight: 600 },
              '& .Mui-selected': { color: '#2E86AB' },
              '& .MuiTabs-indicator': { bgcolor: '#2E86AB' }
            }}
          >
            <Tab label={CATEGORY_LABELS['all']} value="all" />
            <Tab label={CATEGORY_LABELS['elementary']} value="elementary" />
            <Tab label={CATEGORY_LABELS['middle']} value="middle" />
            <Tab label={CATEGORY_LABELS['high']} value="high" />
            <Tab label={CATEGORY_LABELS['etc']} value="etc" />
          </Tabs>

          <Stack direction="row" spacing={2} alignItems="center">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
              aria-label="view mode"
            >
              <ToggleButton value="grid" aria-label="grid view">
                <GridView />
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <ViewList />
              </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'grid' && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  startAdornment={<Sort sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="newest">최신순</MenuItem>
                  <MenuItem value="oldest">오래된순</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </Stack>

              {viewMode === 'list' ? (
              <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8F9FA' }}>
                    <TableRow>

                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'title'}
                          direction={orderBy === 'title' ? order : 'asc'}
                          onClick={() => handleRequestSort('title')}
                        >
                          Title
                        </TableSortLabel>
                      </TableCell>
                      <TableCell width={120}>
                        <TableSortLabel
                          active={orderBy === 'category'}
                          direction={orderBy === 'category' ? order : 'asc'}
                          onClick={() => handleRequestSort('category')}
                        >
                          Category
                        </TableSortLabel>
                      </TableCell>
                      <TableCell width={120}>
                        <TableSortLabel
                          active={orderBy === 'training_date'}
                          direction={orderBy === 'training_date' ? order : 'asc'}
                          onClick={() => handleRequestSort('training_date')}
                        >
                          Date
                        </TableSortLabel>
                      </TableCell>
                      <TableCell width={100}>Instructor</TableCell>
                      <TableCell width={100} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow 
                        key={material.id}
                        hover
                        onClick={() => window.open(material.file_url, '_blank')}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {material.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 300 }}>
                            {material.subtitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={material.category === 'etc' ? 'General' : material.category} 
                            size="small" 
                            color={material.category === 'elementary' ? 'primary' : material.category === 'middle' ? 'secondary' : material.category === 'high' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{material.training_date}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{material.instructor}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {user && (
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(material)
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Grid container spacing={3}>
                <AnimatePresence>
                  {filteredMaterials.map((material) => {
                    const isExpanded = material.id ? expandedIds.includes(material.id) : false
                    
                    return (
                      <Grid size={{ xs: 12, md: 6, lg: 4 }} key={material.id}>
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            sx={{
                              height: '100%',
                              borderRadius: 3,
                              bgcolor: '#fff',
                              boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
                              border: '1px solid rgba(0,0,0,0.05)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                              }
                            }}
                            onClick={() => material.id && toggleExpand(material.id)}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                <Chip 
                                  label={CATEGORY_LABELS[material.category]} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: material.category === 'elementary' ? '#E3F2FD' : material.category === 'middle' ? '#F3E5F5' : material.category === 'high' ? '#E8F5E9' : '#F5F5F5',
                                    color: material.category === 'elementary' ? '#1976D2' : material.category === 'middle' ? '#9C27B0' : material.category === 'high' ? '#2E7D32' : '#616161',
                                    fontWeight: 500
                                  }} 
                                />
                              </Stack>
                              <Typography variant="h6" fontWeight={700} sx={{ mb: 1, minHeight: 64, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {material.title}
                              </Typography>
                              
                              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {material.training_date}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {material.instructor}
                                  </Typography>
                                </Stack>
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2, height: 24, overflow: 'hidden' }}>
                                {material.tags?.slice(0, 3).map(tag => (
                                  <Chip 
                                    key={tag} 
                                    label={tag} 
                                    size="small" 
                                    sx={{ bgcolor: '#F1F3F5', color: '#495057', fontSize: '0.70rem', height: 24 }} 
                                  />
                                ))}
                              </Stack>

                              {/* Expanded Content */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <Box sx={{ pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                      <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: '0.875rem' }}>
                                        {material.description}
                                      </Typography>
                                      
                                      <Box 
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{ mt: 2 }}
                                      >
                                         {renderEmbed(material)}
                                      </Box>
                                      
                                      {user && (
                                        <Button 
                                          startIcon={<EditIcon />} 
                                          size="small" 
                                          fullWidth 
                                          sx={{ mt: 2 }}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEdit(material)
                                          }}
                                        >
                                          Edit Material
                                        </Button>
                                      )}
                                    </Box>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    )
                  })}
                </AnimatePresence>
              </Grid>
            )}
              
              {filteredMaterials.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <Typography>해당 카테고리에 자료가 없습니다.</Typography>
                </Box>
              )}
            </Stack>

        )}

        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Button 
            component={Link} 
            href="/main" 
            startIcon={<ArrowBack />}
            sx={{ color: '#585A5C' }}
          >
            메인으로 돌아가기
          </Button>
        </Box>
      </Container>

      {/* Floating Action Button for Adding New Material */}
      {user && (
        <Tooltip title="Add Training Material">
          <Fab 
            color="primary" 
            aria-label="add" 
            sx={{ position: 'fixed', bottom: 32, right: 32 }}
            onClick={handleAdd}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      )}

      <MaterialModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSave}
        initialData={editingMaterial}
      />
    </Box>
  )
}
