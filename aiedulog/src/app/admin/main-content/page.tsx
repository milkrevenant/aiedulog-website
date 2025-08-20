'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Stack,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material'
import {
  Edit,
  Delete,
  Add,
  Save,
  Cancel,
  DragIndicator,
  Visibility,
  VisibilityOff,
  ArrowUpward,
  ArrowDownward,
  Settings,
  Menu as MenuIcon,
  Article,
  Campaign,
  Newspaper,
} from '@mui/icons-material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function MainContentManagement() {
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [navigationItems, setNavigationItems] = useState<any[]>([])
  const [heroContent, setHeroContent] = useState<any>(null)
  const [featureCards, setFeatureCards] = useState<any[]>([])
  const [editDialog, setEditDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  // 데이터 로드
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // 네비게이션 아이템 로드
      const { data: navItems } = await supabase
        .from('navigation_items')
        .select('*')
        .order('order_index')

      // 히어로 콘텐츠 로드
      const { data: hero } = await supabase
        .from('main_hero_content')
        .select('*')
        .eq('is_active', true)
        .single()

      // 기능 카드 로드
      const { data: cards } = await supabase
        .from('main_feature_cards')
        .select('*')
        .order('order_index')

      setNavigationItems(navItems || [])
      setHeroContent(hero)
      setFeatureCards(cards || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // 네비게이션 아이템 편집
  const handleEditNavItem = (item: any) => {
    setEditingItem(item)
    setEditDialog(true)
  }

  const handleSaveNavItem = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('navigation_items')
        .update(editingItem)
        .eq('id', editingItem.id)

      if (!error) {
        await loadData()
        setEditDialog(false)
        setEditingItem(null)
      }
    } catch (error) {
      console.error('Error saving navigation item:', error)
    } finally {
      setSaving(false)
    }
  }

  // 히어로 콘텐츠 저장
  const handleSaveHero = async () => {
    setSaving(true)
    try {
      if (heroContent?.id) {
        await supabase.from('main_hero_content').update(heroContent).eq('id', heroContent.id)
      } else {
        await supabase.from('main_hero_content').insert(heroContent)
      }
      alert('히어로 섹션이 저장되었습니다.')
    } catch (error) {
      console.error('Error saving hero content:', error)
    } finally {
      setSaving(false)
    }
  }

  // 기능 카드 순서 변경
  const handleMoveCard = async (index: number, direction: 'up' | 'down') => {
    const newCards = [...featureCards]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < newCards.length) {
      ;[newCards[index], newCards[targetIndex]] = [newCards[targetIndex], newCards[index]]

      // 순서 업데이트
      newCards.forEach((card, i) => {
        card.order_index = i
      })

      setFeatureCards(newCards)

      // DB 업데이트
      for (const card of newCards) {
        await supabase
          .from('main_feature_cards')
          .update({ order_index: card.order_index })
          .eq('id', card.id)
      }
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
          메인 페이지 콘텐츠 관리
        </Typography>

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<MenuIcon />} label="네비게이션" />
            <Tab icon={<Campaign />} label="히어로 섹션" />
            <Tab icon={<Article />} label="기능 카드" />
            <Tab icon={<Newspaper />} label="페이지 콘텐츠" />
          </Tabs>

          {/* 네비게이션 관리 */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <Typography variant="h6">네비게이션 메뉴 관리</Typography>
                <Button variant="contained" startIcon={<Add />}>
                  메뉴 추가
                </Button>
              </Stack>

              <List>
                {navigationItems
                  .filter((item) => !item.parent_key)
                  .map((item) => (
                    <Box key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={item.label}
                          secondary={
                            item.is_dropdown ? '드롭다운 메뉴' : `링크: ${item.href || '없음'}`
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton onClick={() => handleEditNavItem(item)}>
                            <Edit />
                          </IconButton>
                          <IconButton>
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>

                      {/* 하위 메뉴 */}
                      {item.is_dropdown && (
                        <Box sx={{ pl: 4 }}>
                          {navigationItems
                            .filter((subItem) => subItem.parent_key === item.key)
                            .map((subItem) => (
                              <ListItem key={subItem.id}>
                                <ListItemText
                                  primary={subItem.label}
                                  secondary={`링크: ${subItem.href}`}
                                />
                                <ListItemSecondaryAction>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditNavItem(subItem)}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                        </Box>
                      )}
                      <Divider />
                    </Box>
                  ))}
              </List>
            </Box>
          </TabPanel>

          {/* 히어로 섹션 */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                히어로 섹션 편집
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="제목"
                    value={heroContent?.title || ''}
                    onChange={(e) => setHeroContent({ ...heroContent, title: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="부제목"
                    value={heroContent?.subtitle || ''}
                    onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="설명"
                    value={heroContent?.description || ''}
                    onChange={(e) =>
                      setHeroContent({ ...heroContent, description: e.target.value })
                    }
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="메인 버튼 텍스트"
                    value={heroContent?.primary_button_text || ''}
                    onChange={(e) =>
                      setHeroContent({ ...heroContent, primary_button_text: e.target.value })
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="메인 버튼 링크"
                    value={heroContent?.primary_button_href || ''}
                    onChange={(e) =>
                      setHeroContent({ ...heroContent, primary_button_href: e.target.value })
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="보조 버튼 텍스트"
                    value={heroContent?.secondary_button_text || ''}
                    onChange={(e) =>
                      setHeroContent({ ...heroContent, secondary_button_text: e.target.value })
                    }
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveHero}
                disabled={saving}
              >
                저장하기
              </Button>
            </Box>
          </TabPanel>

          {/* 기능 카드 */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <Typography variant="h6">기능 카드 관리</Typography>
                <Button variant="contained" startIcon={<Add />}>
                  카드 추가
                </Button>
              </Stack>

              <Grid container spacing={2}>
                {featureCards.map((card, index) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={card.id}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                          <Typography variant="h6">{card.title}</Typography>
                          <Chip
                            label={card.is_active ? '활성' : '비활성'}
                            size="small"
                            color={card.is_active ? 'success' : 'default'}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {card.description}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          버튼: {card.button_text} → {card.button_href}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveCard(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUpward />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveCard(index, 'down')}
                          disabled={index === featureCards.length - 1}
                        >
                          <ArrowDownward />
                        </IconButton>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                        <IconButton size="small">
                          <Delete />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>

          {/* 페이지 콘텐츠 */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                페이지 콘텐츠 관리
              </Typography>

              <List>
                <ListItem>
                  <ListItemText
                    primary="소개 페이지"
                    secondary="연구회 소개, 회원 안내, 활동 내역"
                  />
                  <Button variant="outlined" onClick={() => router.push('/admin/pages/intro')}>
                    편집
                  </Button>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="자료공유 페이지"
                    secondary="AI 도구, 수업 지도안, 평가 자료 등"
                  />
                  <Button variant="outlined" onClick={() => router.push('/admin/pages/share')}>
                    편집
                  </Button>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="비전 페이지" secondary="연구회의 비전과 목표" />
                  <Button variant="outlined" onClick={() => router.push('/admin/pages/vision')}>
                    편집
                  </Button>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="뉴스 페이지" secondary="공지사항 및 최신 소식" />
                  <Button variant="outlined" onClick={() => router.push('/admin/pages/news')}>
                    편집
                  </Button>
                </ListItem>
              </List>
            </Box>
          </TabPanel>
        </Paper>

        {/* 편집 다이얼로그 */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>메뉴 편집</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="메뉴 이름"
              value={editingItem?.label || ''}
              onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
              sx={{ mb: 2, mt: 2 }}
            />
            <TextField
              fullWidth
              label="링크 URL"
              value={editingItem?.href || ''}
              onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editingItem?.is_active || false}
                  onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                />
              }
              label="활성화"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>취소</Button>
            <Button onClick={handleSaveNavItem} variant="contained" disabled={saving}>
              저장
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}

export default function MainContentPage() {
  return (
    <AuthGuard requireAuth requireModerator>
      <MainContentManagement />
    </AuthGuard>
  )
}
