'use client'
/**
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 */

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getUserIdentity } from '@/lib/identity/helpers'
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Avatar,
  Stack,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Badge,
  useTheme,
  alpha,
  Snackbar,
} from '@mui/material'
import {
  PhotoCamera,
  Delete,
  Save,
  ArrowBack,
  Edit,
  CheckCircle,
  CloudUpload,
  Security,
  ChevronRight,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [savingNickname, setSavingNickname] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { data: session, status } = useSession()
  const theme = useTheme()

  useEffect(() => {
    const syncUser = async () => {
      if (status === 'loading') return
      if (status === 'unauthenticated') {
        router.push('/auth/login')
        return
      }
      const authUser = session?.user as any
      setUser(authUser || null)
      setEmail((authUser?.email as string) || '')

      if (authUser) {
        const identity = await getUserIdentity(authUser, supabase)
        if (identity?.profile) {
          setProfile(identity.profile)
          setAvatarUrl(identity.profile.avatar_url || null)
          setNickname(identity.profile.nickname || identity.profile.email?.split('@')[0] || '')
        } else {
          console.error('No identity profile found for user:', authUser?.id || authUser?.sub)
          setError('프로필을 불러올 수 없습니다. 관리자에게 문의하세요.')
        }
      }

      setLoading(false)
    }
    syncUser()
  }, [status, session, router, supabase])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.')
        return
      }

      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadAvatar = async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    setError(null)

    try {
      // 기존 아바타 삭제
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${(user as any).sub || user.id}/${oldPath}`])
        }
      }

      // 새 아바타 업로드
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${(user as any).sub || user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Public URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)

      // 프로필 업데이트 - 완전히 통합된 Identity 시스템 사용
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', profile?.user_id)

      if (error) {
        console.error('Avatar URL update failed:', error)
        throw new Error(`아바타 URL 업데이트 실패: ${error.message}`)
      }

      setAvatarUrl(publicUrl)
      setProfile({ ...profile, avatar_url: publicUrl })
      setSelectedFile(null)
      setPreviewUrl(null)
      setSuccess(true)
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      setError('아바타 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!avatarUrl || !user) return

    setUploading(true)
    setError(null)

    try {
      // Storage에서 삭제
      const path = avatarUrl.split('/').pop()
      if (path) {
        await supabase.storage.from('avatars').remove([`${(user as any).sub || user.id}/${path}`])
      }

      // 프로필 업데이트 - 완전히 통합된 Identity 시스템 사용
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', profile?.user_id)

      if (error) {
        console.error('Avatar removal failed:', error)
        throw new Error(`아바타 삭제 실패: ${error.message}`)
      }

      setAvatarUrl(null)
      setProfile({ ...profile, avatar_url: null })
      setSuccess(true)
    } catch (error: any) {
      console.error('Avatar remove error:', error)
      setError('아바타 삭제에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleCancelPreview = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveNickname = async () => {
    if (!nickname.trim() || !user) return

    setSavingNickname(true)
    setError(null)

    try {
      // 닉네임 업데이트 - 완전히 통합된 Identity 시스템 사용
      const { error } = await supabase
        .from('user_profiles')
        .update({ nickname: nickname.trim() })
        .eq('user_id', profile?.user_id)

      if (error) {
        console.error('Nickname update failed:', error)
        throw new Error(`닉네임 업데이트 실패: ${error.message}`)
      }

      setProfile({ ...profile, nickname: nickname.trim() })
      setIsEditingNickname(false)
      setSuccess(true)
    } catch (error: any) {
      console.error('Nickname update error:', error)
      setError('닉네임 변경에 실패했습니다.')
    } finally {
      setSavingNickname(false)
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          bgcolor: 'grey.50',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!user || !profile) return null

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      <AppHeader user={user} profile={profile} />
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* 헤더 */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => router.push('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            프로필 설정
          </Typography>
        </Stack>

        {/* 아바타 섹션 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              프로필 사진
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              {/* 현재 아바타 또는 미리보기 */}
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <IconButton
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PhotoCamera />
                  </IconButton>
                }
              >
                <Avatar
                  src={previewUrl || avatarUrl || undefined}
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: 'primary.main',
                    fontSize: 48,
                  }}
                >
                  {!previewUrl && !avatarUrl && profile?.email?.[0]?.toUpperCase()}
                </Avatar>
              </Badge>

              {/* 업로드 컨트롤 */}
              <Box sx={{ flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                />

                {previewUrl ? (
                  // 미리보기 상태
                  (<Stack spacing={2}>
                    <Alert severity="info">
                      새 프로필 사진이 선택되었습니다. 업로드 버튼을 클릭하세요.
                    </Alert>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                        onClick={handleUploadAvatar}
                        disabled={uploading}
                      >
                        업로드
                      </Button>
                      <Button variant="outlined" onClick={handleCancelPreview} disabled={uploading}>
                        취소
                      </Button>
                    </Stack>
                  </Stack>)
                ) : (
                  // 기본 상태
                  (<Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      JPG, PNG, GIF 형식 (최대 5MB)
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        사진 선택
                      </Button>
                      {avatarUrl && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={uploading ? <CircularProgress size={20} /> : <Delete />}
                          onClick={handleRemoveAvatar}
                          disabled={uploading}
                        >
                          삭제
                        </Button>
                      )}
                    </Stack>
                  </Stack>)
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* 보안 설정 섹션 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              보안 설정
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderColor: 'primary.main',
                },
              }}
              onClick={() => router.push('/settings/security')}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Security sx={{ color: 'primary.main', fontSize: 32 }} />
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    2단계 인증
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    계정 보안을 강화하고 무단 접근을 방지합니다
                  </Typography>
                </Box>
                <ChevronRight color="action" />
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* 프로필 정보 섹션 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              기본 정보
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              <Box>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <TextField
                    label="닉네임"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={!isEditingNickname}
                    fullWidth
                    helperText="다른 사용자에게 표시되는 이름입니다"
                    error={nickname.trim().length === 0}
                  />
                  {isEditingNickname ? (
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={handleSaveNickname}
                        disabled={savingNickname || nickname.trim().length === 0}
                        startIcon={savingNickname && <CircularProgress size={20} />}
                        sx={{ height: 56, minWidth: 100, fontSize: '1rem' }}
                      >
                        저장
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setIsEditingNickname(false)
                          setNickname(profile?.nickname || profile?.email?.split('@')[0] || '')
                        }}
                        disabled={savingNickname}
                        sx={{ height: 56, minWidth: 100, fontSize: '1rem' }}
                      >
                        취소
                      </Button>
                    </Stack>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setIsEditingNickname(true)}
                      startIcon={<Edit />}
                      sx={{
                        height: 56,
                        minWidth: 120,
                        whiteSpace: 'nowrap',
                        fontSize: '1rem', // TextField와 동일한 크기
                      }}
                    >
                      수정
                    </Button>
                  )}
                </Stack>
              </Box>

              <TextField
                label="이메일"
                value={email}
                disabled
                fullWidth
                helperText="이메일은 변경할 수 없습니다"
              />

              <TextField
                label="권한"
                value={
                  profile?.role === 'admin'
                    ? '관리자'
                    : profile?.role === 'moderator'
                      ? '운영진'
                      : profile?.role === 'verified'
                        ? '인증 교사'
                        : '일반 회원'
                }
                disabled
                fullWidth
                helperText="권한은 관리자가 변경할 수 있습니다"
              />

              <TextField
                label="가입일"
                value={new Date(user.created_at).toLocaleDateString('ko-KR')}
                disabled
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>
      </Container>
      {/* 성공 메시지 */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          프로필이 업데이트되었습니다!
        </Alert>
      </Snackbar>
      {/* 에러 메시지 */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
