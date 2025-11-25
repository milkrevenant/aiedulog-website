'use client'
/**
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getUserIdentity } from '@/lib/identity/helpers'
import {
  Box,
  Container,
  Typography,
  
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Avatar,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Badge,
  Tabs,
  Tab,
  Fab,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Search,
  Menu as MenuIcon,
  FilterList,
  CalendarMonth,
  LocationOn,
  Person,
  Group,
  AttachMoney,
  Schedule,
  School,
  CheckCircle,
  Info,
  Favorite,
  FavoriteBorder,
  Share,
  TrendingUp,
  EmojiEvents,
  OndemandVideo,
  LocationCity,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import FeedSidebar from '@/components/FeedSidebar'
import SideChat from '@/components/SideChat'
import PostEditor from '@/components/PostEditor'

interface Lecture {
  id: string
  title: string
  subtitle: string
  description: string
  instructor_name: string
  instructor_bio: string
  instructor_image: string
  category: string
  level: string
  duration: string
  price: number
  max_participants: number
  current_participants: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  schedule_details: string
  location_type: string
  location_address: string
  location_url: string
  thumbnail_image: string
  banner_image: string
  status: string
  registration_open: boolean
  featured: boolean
  created_at: string
  view_count: number
  tags: string[]
}

export default function LecturesBoardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { data: session } = useSession()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null)
  const [registrationDialog, setRegistrationDialog] = useState(false)
  const [detailDialog, setDetailDialog] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [userRegistrations, setUserRegistrations] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    checkUser()
    fetchLectures()
  }, [])

  const checkUser = async () => {
    const authUser = session?.user as any
    setUser(authUser || null)
    if (authUser) {
      fetchUserRegistrations((authUser as any).sub || authUser.id)
      const identity = await getUserIdentity(authUser)
      setProfile(identity?.profile || null)
    }
  }

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('status', 'published')
        .order('featured', { ascending: false })
        .order('start_date', { ascending: true })

      if (error) throw error
      setLectures(data || [])
    } catch (error) {
      console.error('Error fetching lectures:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRegistrations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('lecture_registrations')
        .select('lecture_id')
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed'])

      if (error) throw error
      setUserRegistrations(data?.map((r: any) => r.lecture_id) || [])
    } catch (error) {
      console.error('Error fetching registrations:', error)
    }
  }

  const handleRegistration = async () => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    if (!selectedLecture) return

    try {
      const { error } = await supabase.from('lecture_registrations').insert({
        lecture_id: selectedLecture.id,
        user_id: user.id,
        status: 'pending',
        payment_status: selectedLecture.price > 0 ? 'pending' : 'paid',
      })

      if (error) throw error

      setUserRegistrations([...userRegistrations, selectedLecture.id])
      setRegistrationDialog(false)
      alert('수강 신청이 완료되었습니다!')
    } catch (error: any) {
      if (error.code === '23505') {
        alert('이미 신청한 강의입니다.')
      } else {
        console.error('Error registering:', error)
        alert('신청 중 오류가 발생했습니다.')
      }
    }
  }

  const toggleFavorite = (lectureId: string) => {
    if (favorites.includes(lectureId)) {
      setFavorites(favorites.filter((id) => id !== lectureId))
    } else {
      setFavorites([...favorites, lectureId])
    }
  }

  const incrementViewCount = async (lectureId: string) => {
    try {
      await supabase.rpc('increment', {
        table_name: 'lectures',
        row_id: lectureId,
        column_name: 'view_count',
      })
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return '초급'
      case 'intermediate':
        return '중급'
      case 'advanced':
        return '고급'
      default:
        return level
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'ai':
        return 'AI'
      case 'education':
        return '교육'
      case 'workshop':
        return '워크샵'
      case 'seminar':
        return '세미나'
      case 'certification':
        return '자격증'
      default:
        return category
    }
  }

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <OndemandVideo />
      case 'offline':
        return <LocationCity />
      case 'hybrid':
        return <LocationOn />
      default:
        return <LocationOn />
    }
  }

  const filteredLectures = lectures.filter((lecture) => {
    const matchesSearch =
      lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecture.instructor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecture.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || lecture.category === categoryFilter
    const matchesLevel = levelFilter === 'all' || lecture.level === levelFilter
    const matchesLocation = locationFilter === 'all' || lecture.location_type === locationFilter

    if (tabValue === 0) {
      // 전체
      return matchesSearch && matchesCategory && matchesLevel && matchesLocation
    } else if (tabValue === 1) {
      // 추천
      return matchesSearch && matchesCategory && matchesLevel && matchesLocation && lecture.featured
    } else if (tabValue === 2) {
      // 내 강의
      return (
        matchesSearch &&
        matchesCategory &&
        matchesLevel &&
        matchesLocation &&
        userRegistrations.includes(lecture.id)
      )
    }

    return matchesSearch && matchesCategory && matchesLevel && matchesLocation
  })

  const isRegistered = (lectureId: string) => userRegistrations.includes(lectureId)
  const isFull = (lecture: Lecture) => lecture.current_participants >= lecture.max_participants

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      {/* 공통 헤더 */}
      <AppHeader user={user} profile={profile} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 3,
          px: 3,
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 0, md: 3 }}
          alignItems="flex-start"
          sx={{
            width: '100%',
            maxWidth: {
              xs: '100%',
              sm: 600,
              md: 900,
              lg: 1320,
            },
            mx: 'auto',
          }}
        >
          {/* 왼쪽 사이드바 - 데스크탑/태블릿만 표시 */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 260,
              flexShrink: 0,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: 260,
                height: 'calc(100vh - 64px)',
                position: 'sticky',
                top: 80,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <FeedSidebar user={user} profile={profile} isStatic={true} />
            </Paper>
          </Box>

          {/* Main Content */}
          <Box
            sx={{
              width: '100%',
              maxWidth: {
                xs: '100%',
                sm: 600,
                lg: 720,
              },
              flex: '0 0 auto',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Stack spacing={3} mb={4}>
              <Typography variant="h3" fontWeight="bold" textAlign="center">
                <School sx={{ fontSize: 48, mr: 2, verticalAlign: 'middle' }} />
                강의 안내
              </Typography>
              <Typography variant="h6" color="text.secondary" textAlign="center">
                AI 시대를 선도하는 전문 교육 프로그램
              </Typography>
            </Stack>

            {/* 글 작성 영역 - PostEditor 추가 */}
            {user && (
              <Box sx={{ mb: 3 }}>
                <PostEditor
                  user={user}
                  profile={profile}
                  category="lecture"
                  onPostCreated={fetchLectures}
                  placeholder="강의 정보를 입력해주세요.\n예) 강의명, 강사, 일정, 장소, 수강료 등"
                />
              </Box>
            )}

            {/* Search and Filters */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <FormControl
                  sx={{
                    flex: '1 1 30%',
                    '@media (min-width: 804px)': {
                      flex: '0 0 auto',
                      minWidth: 120,
                    },
                  }}
                >
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="카테고리"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="ai">AI</MenuItem>
                    <MenuItem value="education">교육</MenuItem>
                    <MenuItem value="workshop">워크샵</MenuItem>
                    <MenuItem value="seminar">세미나</MenuItem>
                    <MenuItem value="certification">자격증</MenuItem>
                  </Select>
                </FormControl>

                <FormControl
                  sx={{
                    flex: '1 1 30%',
                    '@media (min-width: 804px)': {
                      flex: '0 0 auto',
                      minWidth: 120,
                    },
                  }}
                >
                  <InputLabel>난이도</InputLabel>
                  <Select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    label="난이도"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="beginner">초급</MenuItem>
                    <MenuItem value="intermediate">중급</MenuItem>
                    <MenuItem value="advanced">고급</MenuItem>
                  </Select>
                </FormControl>

                <FormControl
                  sx={{
                    flex: '1 1 30%',
                    '@media (min-width: 804px)': {
                      flex: '0 0 auto',
                      minWidth: 120,
                    },
                  }}
                >
                  <InputLabel>강의 형태</InputLabel>
                  <Select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    label="강의 형태"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="online">온라인</MenuItem>
                    <MenuItem value="offline">오프라인</MenuItem>
                    <MenuItem value="hybrid">하이브리드</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  sx={{
                    flex: '1 1 100%',
                    '@media (min-width: 804px)': {
                      flex: 1,
                      minWidth: 300,
                    },
                  }}
                  placeholder="강의명, 강사명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Paper>

            {/* Tabs */}
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
              <Tab label="전체 강의" />
              <Tab
                label={
                  <Badge badgeContent={lectures.filter((l) => l.featured).length} color="primary">
                    <span>추천 강의</span>
                  </Badge>
                }
              />
              {user && (
                <Tab
                  label={
                    <Badge badgeContent={userRegistrations.length} color="success">
                      <span>내 강의</span>
                    </Badge>
                  }
                />
              )}
            </Tabs>

            {/* Lectures Grid */}
            <Grid container spacing={3} justifyContent="center">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <Grid
                    key={i}
                    size={{
                      xs: 12,
                      md: 6,
                      lg: 4
                    }}>
                    <Skeleton variant="rectangular" height={400} />
                  </Grid>
                ))
              ) : filteredLectures.length === 0 ? (
                <Grid>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      검색 결과가 없습니다.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                filteredLectures.map((lecture) => (
                  <Grid
                    key={lecture.id}
                    size={{
                      xs: 12,
                      md: 6,
                      lg: 4
                    }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {lecture.thumbnail_image && (
                        <CardMedia
                          component="img"
                          height="200"
                          image={lecture.thumbnail_image}
                          alt={lecture.title}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Stack spacing={2}>
                          {/* Title and Featured Badge */}
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              {lecture.featured && (
                                <Chip
                                  icon={<TrendingUp />}
                                  label="추천"
                                  color="primary"
                                  size="small"
                                />
                              )}
                              {isRegistered(lecture.id) && (
                                <Chip
                                  icon={<CheckCircle />}
                                  label="신청완료"
                                  color="success"
                                  size="small"
                                />
                              )}
                            </Stack>
                            <Typography variant="h6" gutterBottom>
                              {lecture.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {lecture.subtitle}
                            </Typography>
                          </Box>

                          {/* Instructor */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {lecture.instructor_name[0]}
                            </Avatar>
                            <Typography variant="body2">{lecture.instructor_name}</Typography>
                          </Stack>

                          {/* Info Chips */}
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              icon={<School />}
                              label={getCategoryLabel(lecture.category)}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              icon={<EmojiEvents />}
                              label={getLevelLabel(lecture.level)}
                              size="small"
                              variant="outlined"
                              color={
                                lecture.level === 'beginner'
                                  ? 'success'
                                  : lecture.level === 'intermediate'
                                    ? 'warning'
                                    : 'error'
                              }
                            />
                            <Chip
                              icon={getLocationIcon(lecture.location_type)}
                              label={
                                lecture.location_type === 'online'
                                  ? '온라인'
                                  : lecture.location_type === 'offline'
                                    ? '오프라인'
                                    : '하이브리드'
                              }
                              size="small"
                              variant="outlined"
                            />
                          </Stack>

                          {/* Schedule */}
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CalendarMonth fontSize="small" color="action" />
                              <Typography variant="body2">
                                {new Date(lecture.start_date).toLocaleDateString()} 시작
                              </Typography>
                            </Stack>
                            {lecture.duration && (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Schedule fontSize="small" color="action" />
                                <Typography variant="body2">{lecture.duration}</Typography>
                              </Stack>
                            )}
                          </Stack>

                          {/* Participants & Price */}
                          <Stack direction="row" justifyContent="space-between">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Group fontSize="small" color="action" />
                              <Typography variant="body2">
                                {lecture.current_participants}/{lecture.max_participants}명
                              </Typography>
                            </Stack>
                            {lecture.price > 0 ? (
                              <Typography variant="h6" color="primary">
                                {lecture.price.toLocaleString()}원
                              </Typography>
                            ) : (
                              <Chip label="무료" color="success" size="small" />
                            )}
                          </Stack>

                          {/* Progress Bar */}
                          <Box sx={{ position: 'relative' }}>
                            <Box
                              sx={{
                                height: 4,
                                bgcolor: 'grey.200',
                                borderRadius: 2,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${(lecture.current_participants / lecture.max_participants) * 100}%`,
                                  bgcolor: isFull(lecture) ? 'error.main' : 'primary.main',
                                  transition: 'width 0.3s',
                                }}
                              />
                            </Box>
                          </Box>
                        </Stack>
                      </CardContent>

                      <Divider />

                      <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" onClick={() => toggleFavorite(lecture.id)}>
                            {favorites.includes(lecture.id) ? (
                              <Favorite color="error" />
                            ) : (
                              <FavoriteBorder />
                            )}
                          </IconButton>
                          <IconButton size="small">
                            <Share />
                          </IconButton>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<Info />}
                            onClick={() => {
                              setSelectedLecture(lecture)
                              setDetailDialog(true)
                              incrementViewCount(lecture.id)
                            }}
                          >
                            상세보기
                          </Button>
                          {!isRegistered(lecture.id) && (
                            <Button
                              variant="contained"
                              size="small"
                              disabled={!lecture.registration_open || isFull(lecture)}
                              onClick={() => {
                                setSelectedLecture(lecture)
                                setRegistrationDialog(true)
                              }}
                            >
                              {isFull(lecture) ? '마감' : '신청'}
                            </Button>
                          )}
                        </Stack>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>

            {/* Registration Dialog */}
            <Dialog
              open={registrationDialog}
              onClose={() => setRegistrationDialog(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>수강 신청</DialogTitle>
              <DialogContent>
                {selectedLecture && (
                  <Stack spacing={2}>
                    <Alert severity="info">다음 강의에 수강 신청하시겠습니까?</Alert>
                    <Typography variant="h6">{selectedLecture.title}</Typography>
                    <Divider />
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>강사:</strong> {selectedLecture.instructor_name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>일정:</strong>{' '}
                        {new Date(selectedLecture.start_date).toLocaleDateString()} ~{' '}
                        {selectedLecture.end_date &&
                          new Date(selectedLecture.end_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>시간:</strong> {selectedLecture.start_time} ~{' '}
                        {selectedLecture.end_time}
                      </Typography>
                      <Typography variant="body2">
                        <strong>장소:</strong>{' '}
                        {selectedLecture.location_type === 'online'
                          ? '온라인'
                          : selectedLecture.location_address}
                      </Typography>
                      <Typography variant="body2">
                        <strong>수강료:</strong>{' '}
                        {selectedLecture.price > 0
                          ? `${selectedLecture.price.toLocaleString()}원`
                          : '무료'}
                      </Typography>
                    </Stack>
                    {selectedLecture.price > 0 && (
                      <Alert severity="warning">수강료 결제는 별도 안내 예정입니다.</Alert>
                    )}
                  </Stack>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setRegistrationDialog(false)}>취소</Button>
                <Button onClick={handleRegistration} variant="contained">
                  신청하기
                </Button>
              </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog
              open={detailDialog}
              onClose={() => setDetailDialog(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">{selectedLecture?.title}</Typography>
                  <IconButton onClick={() => setDetailDialog(false)}>×</IconButton>
                </Stack>
              </DialogTitle>
              <DialogContent>
                {selectedLecture && (
                  <Stack spacing={3}>
                    {selectedLecture.banner_image && (
                      <Box
                        component="img"
                        src={selectedLecture.banner_image}
                        alt={selectedLecture.title}
                        sx={{ width: '100%', borderRadius: 2 }}
                      />
                    )}

                    <Typography variant="h6" color="text.secondary">
                      {selectedLecture.subtitle}
                    </Typography>

                    <Divider />

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        강의 소개
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedLecture.description}
                      </Typography>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        강사 소개
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ width: 64, height: 64 }}>
                          {selectedLecture.instructor_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {selectedLecture.instructor_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedLecture.instructor_bio}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h6" gutterBottom>
                        강의 정보
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">
                            카테고리
                          </Typography>
                          <Typography variant="body1">
                            {getCategoryLabel(selectedLecture.category)}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">
                            난이도
                          </Typography>
                          <Typography variant="body1">
                            {getLevelLabel(selectedLecture.level)}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">
                            기간
                          </Typography>
                          <Typography variant="body1">{selectedLecture.duration}</Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">
                            수강료
                          </Typography>
                          <Typography variant="body1">
                            {selectedLecture.price > 0
                              ? `${selectedLecture.price.toLocaleString()}원`
                              : '무료'}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">
                            일정
                          </Typography>
                          <Typography variant="body1">
                            {new Date(selectedLecture.start_date).toLocaleDateString()} ~{' '}
                            {selectedLecture.end_date &&
                              new Date(selectedLecture.end_date).toLocaleDateString()}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary">
                            시간
                          </Typography>
                          <Typography variant="body1">
                            {selectedLecture.start_time} ~ {selectedLecture.end_time}
                          </Typography>
                        </Grid>
                        <Grid size={12}>
                          <Typography variant="body2" color="text.secondary">
                            일정 상세
                          </Typography>
                          <Typography variant="body1">
                            {selectedLecture.schedule_details}
                          </Typography>
                        </Grid>
                        <Grid size={12}>
                          <Typography variant="body2" color="text.secondary">
                            장소
                          </Typography>
                          <Typography variant="body1">
                            {selectedLecture.location_type === 'online'
                              ? '온라인 (링크는 신청 후 제공)'
                              : selectedLecture.location_address}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Group />
                        <Typography>
                          {selectedLecture.current_participants}/{selectedLecture.max_participants}
                          명 신청
                        </Typography>
                      </Stack>
                      {!isRegistered(selectedLecture.id) && (
                        <Button
                          variant="contained"
                          size="large"
                          disabled={!selectedLecture.registration_open || isFull(selectedLecture)}
                          onClick={() => {
                            setDetailDialog(false)
                            setRegistrationDialog(true)
                          }}
                        >
                          {isFull(selectedLecture) ? '신청 마감' : '수강 신청하기'}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                )}
              </DialogContent>
            </Dialog>
          </Box>

          {/* 오른쪽 채팅 영역 - 데스크탑만 */}
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', lg: 'block' },
            }}
          >
            <Box
              sx={{
                position: 'sticky',
                top: 80,
              }}
            >
              <SideChat user={user} />
            </Box>
          </Box>
        </Stack>
      </Box>
      {/* 모바일 사이드바 (Drawer로 처리됨) */}
      <FeedSidebar
        user={user}
        profile={profile}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(false)}
      />
      {/* 모바일 햄버거 플로팅 버튼 - 왼쪽 하단 */}
      <Fab
        color="primary"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 1100,
        }}
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
      </Fab>
    </Box>
  );
}
