'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Stack,
  Chip,
  Paper,
  Avatar,
  Divider,
  Button,
  Skeleton,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  School,
  CalendarMonth,
  Schedule,
  Group,
  LocationOn,
  OndemandVideo,
  LocationCity,
  Info,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import SideChat from '@/components/SideChat'
import FeedSidebar from '@/components/FeedSidebar'
import type { Lecture } from '@/lib/db/types'
import { getUserIdentity } from '@/lib/identity/helpers'

interface LectureDetailClientProps {
  id: string
}

export default function LectureDetailClient({ id }: LectureDetailClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    const authUser = session?.user as any
    setUser(authUser || null)
    if (authUser) {
      getUserIdentity(authUser).then((identity) => setProfile(identity?.profile || null))
    }
  }, [session])

  useEffect(() => {
    loadLecture()
    incrementViewCount()
  }, [id])

  useEffect(() => {
    if (user) {
      checkRegistration()
    }
  }, [user, id])

  const loadLecture = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lectures/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        setError('강의를 찾을 수 없습니다.')
        setLecture(null)
        return
      }
      const data = (await res.json()) as Lecture
      setLecture(data)
    } catch (err) {
      console.error('Error loading lecture:', err)
      setError('강의 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const checkRegistration = async () => {
    try {
      const res = await fetch('/api/lectures/registrations', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const ids = Array.isArray(data) ? data.map((r: any) => r.lecture_id) : []
      setRegistered(ids.includes(id))
    } catch (err) {
      console.error('Error checking registration:', err)
    }
  }

  const incrementViewCount = async () => {
    try {
      await fetch(`/api/lectures/${id}/view`, { method: 'POST' })
    } catch (err) {
      console.error('Error incrementing view:', err)
    }
  }

  const handleRegistration = async () => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    try {
      const res = await fetch(`/api/lectures/${id}/register`, { method: 'POST' })
      if (!res.ok) {
        if (res.status === 409) {
          alert('이미 신청한 강의입니다.')
          setRegistered(true)
          return
        }
        const message = await res.json().catch(() => ({} as any))
        throw new Error(message?.error || '신청 중 오류가 발생했습니다.')
      }
      await checkRegistration()
      await loadLecture()
      alert('수강 신청이 완료되었습니다!')
    } catch (err: any) {
      console.error('Error registering lecture:', err)
      alert(err?.message || '신청 중 오류가 발생했습니다.')
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

  const getLocationLabel = (type: string) => {
    switch (type) {
      case 'online':
        return '온라인'
      case 'hybrid':
        return '하이브리드'
      default:
        return '오프라인'
    }
  }

  const locationIcon = (type: string) => {
    if (type === 'online') return <OndemandVideo />
    if (type === 'hybrid') return <LocationOn />
    return <LocationCity />
  }

  const isFull = (lecture?: Lecture | null) => {
    if (!lecture) return false
    return lecture.current_participants >= lecture.max_participants
  }

  const canRegister =
    lecture &&
    lecture.registration_open &&
    ['published', 'ongoing'].includes(lecture.status) &&
    !isFull(lecture) &&
    !registered

  const renderSkeleton = () => (
    <Stack spacing={3}>
      <Skeleton variant="rounded" height={240} />
      <Skeleton variant="text" height={48} />
      <Skeleton variant="text" height={32} />
      <Skeleton variant="rounded" height={320} />
    </Stack>
  )

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      <AppHeader user={user} profile={profile} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              lg: 8,
            }}
          >
            {loading && renderSkeleton()}

            {!loading && error && (
              <Paper sx={{ p: 4 }}>
                <Typography variant="h6">{error}</Typography>
                <Button sx={{ mt: 2 }} onClick={() => router.push('/board/lectures')}>
                  목록으로 돌아가기
                </Button>
              </Paper>
            )}

            {!loading && !error && lecture && (
              <Stack spacing={3}>
                {lecture.banner_image && (
                  <Box
                    component="img"
                    src={lecture.banner_image}
                    alt={lecture.title}
                    sx={{ width: '100%', borderRadius: 2, maxHeight: 360, objectFit: 'cover' }}
                  />
                )}

                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <School color="primary" />
                    <Typography variant="h4" fontWeight="bold">
                      {lecture.title}
                    </Typography>
                  </Stack>
                  {lecture.subtitle && (
                    <Typography variant="h6" color="text.secondary">
                      {lecture.subtitle}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={lecture.category} size="small" variant="outlined" />
                    {lecture.level && (
                      <Chip label={getLevelLabel(lecture.level)} size="small" color="primary" />
                    )}
                    <Chip
                      label={getLocationLabel(lecture.location_type)}
                      size="small"
                      icon={locationIcon(lecture.location_type)}
                    />
                    {lecture.featured && <Chip label="추천" color="secondary" size="small" />}
                  </Stack>
                </Stack>

                <Paper sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 56, height: 56 }}>
                        {lecture.instructor_name?.[0] || '강'}
                      </Avatar>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {lecture.instructor_name}
                        </Typography>
                        {lecture.instructor_bio && (
                          <Typography variant="body2" color="text.secondary">
                            {lecture.instructor_bio}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid
                        size={{
                          xs: 12,
                          sm: 6,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarMonth color="action" />
                          <Typography variant="body2">
                            {new Date(lecture.start_date).toLocaleDateString()}
                            {lecture.end_date ? ` ~ ${new Date(lecture.end_date).toLocaleDateString()}` : ''}
                          </Typography>
                        </Stack>
                      </Grid>
                      {lecture.duration && (
                        <Grid
                          size={{
                            xs: 12,
                            sm: 6,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Schedule color="action" />
                            <Typography variant="body2">{lecture.duration}</Typography>
                          </Stack>
                        </Grid>
                      )}
                      <Grid size={12}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Group color="action" />
                          <Typography variant="body2">
                            {lecture.current_participants}/{lecture.max_participants}명 신청
                          </Typography>
                        </Stack>
                      </Grid>
                      {lecture.start_time && lecture.end_time && (
                        <Grid size={12}>
                          <Typography variant="body2" color="text.secondary">
                            시간: {lecture.start_time} ~ {lecture.end_time}
                          </Typography>
                        </Grid>
                      )}
                      <Grid size={12}>
                        <Typography variant="body2" color="text.secondary">
                          장소: {lecture.location_type === 'online' ? '온라인(신청 후 안내)' : lecture.location_address}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Divider />

                    {lecture.description && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          강의 소개
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {lecture.description}
                        </Typography>
                      </Box>
                    )}

                    {lecture.schedule_details && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          일정 상세
                        </Typography>
                        <Typography variant="body1">{lecture.schedule_details}</Typography>
                      </Box>
                    )}

                    {lecture.tags && lecture.tags.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {lecture.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                      </Stack>
                    )}

                    <Divider />

                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                          icon={<Info />}
                          label={lecture.price > 0 ? `${lecture.price.toLocaleString()}원` : '무료'}
                          color={lecture.price > 0 ? 'primary' : 'success'}
                        />
                        <Chip
                          label={`조회수 ${lecture.view_count ?? 0}`}
                          variant="outlined"
                          size="small"
                        />
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={() => router.push('/board/lectures')}>
                          목록으로
                        </Button>
                        {canRegister && (
                          <Button variant="contained" onClick={handleRegistration}>
                            수강 신청하기
                          </Button>
                        )}
                        {!canRegister && (
                          <Chip
                            label={
                              registered
                                ? '신청 완료'
                                : isFull(lecture)
                                  ? '마감'
                                  : lecture?.registration_open === false
                                    ? '신청 불가'
                                    : '신청 조건을 확인하세요'
                            }
                            color={registered ? 'success' : 'default'}
                          />
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            )}
          </Grid>

          <Grid
            size={{
              xs: 12,
              lg: 4,
            }}
          >
            <Stack spacing={2}>
              <Paper
                elevation={0}
                sx={{
                  display: { xs: 'none', md: 'block' },
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  position: 'sticky',
                  top: 88,
                }}
              >
                <FeedSidebar user={user} profile={profile} isStatic />
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  display: { xs: 'none', lg: 'block' },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1,
                  position: 'sticky',
                  top: 88,
                }}
              >
                <SideChat user={user} />
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
