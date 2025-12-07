'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermission } from '@/hooks/usePermission'
import AppHeader from '@/components/AppHeader'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import SearchIcon from '@mui/icons-material/Search'
import ShieldIcon from '@mui/icons-material/Shield'
import BadgeIcon from '@mui/icons-material/Badge'

type StaffRole = '회장' | '부회장' | '운영위원' | '연구위원' | '일반운영진'
type PermissionField = 'can_view' | 'can_create' | 'can_edit' | 'can_delete'

interface StaffMember {
  id: string
  user_id: string
  staff_role: StaffRole
  staff_title: string | null
  department: string | null
  is_active: boolean
  appointed_at: string
  appointed_by: string | null
  notes: string | null
  email?: string
  username?: string
  nickname?: string
  full_name?: string
  avatar_url?: string
}

interface UserOption {
  user_id: string
  email: string
  nickname?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  is_active?: boolean | null
}

interface FormState {
  staff_role: StaffRole
  staff_title: string
  department: string
  is_active: boolean
  notes: string
}

interface PermissionArea {
  id: string
  area_code: string
  area_name: string
  description: string | null
  display_order: number
}

interface UserPermissionEntry {
  area_code: string
  area_name?: string
  description?: string | null
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

const STAFF_ROLES: Array<{ value: StaffRole; label: string }> = [
  { value: '회장', label: '회장' },
  { value: '부회장', label: '부회장' },
  { value: '운영위원', label: '운영위원' },
  { value: '연구위원', label: '연구위원' },
  { value: '일반운영진', label: '일반운영진' },
]

export function StaffManagementClient() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { can, user: currentUser, loading: permissionLoading } = usePermission()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [formState, setFormState] = useState<FormState>({
    staff_role: '일반운영진',
    staff_title: '',
    department: '',
    is_active: true,
    notes: '',
  })
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [permissionAreas, setPermissionAreas] = useState<PermissionArea[]>([])
  const [areaPermissions, setAreaPermissions] = useState<Record<string, UserPermissionEntry>>({})
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [permissionTarget, setPermissionTarget] = useState<StaffMember | null>(null)
  const [permissionDialogLoading, setPermissionDialogLoading] = useState(false)
  const [permissionSaving, setPermissionSaving] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  useEffect(() => {
    if (permissionLoading) return
    if (!currentUser) return
    if (!can('manage_users')) {
      router.push('/feed')
      return
    }
    fetchStaff()
    fetchPermissionAreas()
  }, [can, currentUser, permissionLoading, router])

  const fetchStaff = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('운영진 정보를 불러오지 못했습니다.')
      }
      const data: StaffMember[] = await res.json()
      setStaff(data)
    } catch (err: any) {
      console.error('Failed to load staff', err)
      setError(err.message || '운영진 목록 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionAreas = async (): Promise<PermissionArea[]> => {
    try {
      const res = await fetch('/api/admin/staff?type=areas', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('권한 영역을 불러오지 못했습니다.')
      }
      const data: PermissionArea[] = await res.json()
      setPermissionAreas(data)
      return data
    } catch (err: any) {
      console.error('Failed to load permission areas', err)
      setError(err.message || '권한 영역 조회 중 오류가 발생했습니다.')
      return []
    }
  }

  useEffect(() => {
    if (userSearchTerm.trim().length < 2) {
      setUserOptions([])
      return
    }

    const timer = setTimeout(async () => {
      setUserSearchLoading(true)
      try {
        const { data, error: searchError } = await supabase
          .from('user_profiles')
          .select('user_id, email, nickname, full_name, avatar_url, role, is_active')
          .or(`email.ilike.%${userSearchTerm}%,nickname.ilike.%${userSearchTerm}%,full_name.ilike.%${userSearchTerm}%`)
          .limit(15)

        if (searchError) {
          throw searchError
        }

        const staffUserIds = new Set(staff.map((s) => s.user_id))
        const options =
          data
            ?.filter((item: UserOption) => !staffUserIds.has(item.user_id))
            .map((item: UserOption) => ({
              user_id: item.user_id,
              email: item.email || '',
              nickname: item.nickname,
              full_name: item.full_name,
              avatar_url: item.avatar_url,
              role: item.role,
              is_active: item.is_active,
            })) || []

        setUserOptions(options)
      } catch (err) {
        console.error('User search failed', err)
        setError('사용자 검색 중 오류가 발생했습니다.')
      } finally {
        setUserSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [supabase, userSearchTerm, staff])

  const resetForm = () => {
    setFormState({
      staff_role: '일반운영진',
      staff_title: '',
      department: '',
      is_active: true,
      notes: '',
    })
    setSelectedUser(null)
    setEditingStaff(null)
    setUserSearchTerm('')
    setUserOptions([])
    setDialogOpen(false)
  }

  const handleOpenCreate = () => {
    setEditingStaff(null)
    setFormState({
      staff_role: '일반운영진',
      staff_title: '',
      department: '',
      is_active: true,
      notes: '',
    })
    setSelectedUser(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaff(member)
    setFormState({
      staff_role: member.staff_role,
      staff_title: member.staff_title || '',
      department: member.department || '',
      is_active: member.is_active,
      notes: member.notes || '',
    })
    setSelectedUser({
      user_id: member.user_id,
      email: member.email || '',
      nickname: member.nickname,
      full_name: member.full_name,
      avatar_url: member.avatar_url,
      role: undefined,
      is_active: member.is_active,
    })
    setDialogOpen(true)
  }

  const getPermissionForArea = (areaCode: string): UserPermissionEntry => {
    const existing = areaPermissions[areaCode]
    if (existing) return existing

    const fallbackArea = permissionAreas.find((area) => area.area_code === areaCode)
    return {
      area_code: areaCode,
      area_name: fallbackArea?.area_name || areaCode,
      description: fallbackArea?.description ?? null,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    }
  }

  const handleOpenPermissions = async (member: StaffMember) => {
    setPermissionTarget(member)
    setPermissionDialogOpen(true)
    setPermissionError(null)
    setPermissionDialogLoading(true)

    try {
      const areas = permissionAreas.length > 0 ? permissionAreas : await fetchPermissionAreas()

      const res = await fetch(`/api/admin/staff?type=permissions&user_id=${member.user_id}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('세부 권한을 불러오지 못했습니다.')
      }

      const userPermissions: UserPermissionEntry[] = await res.json()
      const mergedPermissions = (areas || []).reduce((acc, area) => {
        const existing = userPermissions.find((p) => p.area_code === area.area_code)
        acc[area.area_code] = existing
          ? {
              area_code: area.area_code,
              area_name: existing.area_name || area.area_name,
              description: existing.description ?? area.description,
              can_view: existing.can_view,
              can_create: existing.can_create,
              can_edit: existing.can_edit,
              can_delete: existing.can_delete,
            }
          : {
              area_code: area.area_code,
              area_name: area.area_name,
              description: area.description,
              can_view: false,
              can_create: false,
              can_edit: false,
              can_delete: false,
            }
        return acc
      }, {} as Record<string, UserPermissionEntry>)

      setAreaPermissions(mergedPermissions)
    } catch (err: any) {
      console.error('Failed to load user permissions', err)
      setPermissionError(err.message || '세부 권한 조회 중 오류가 발생했습니다.')
    } finally {
      setPermissionDialogLoading(false)
    }
  }

  const closePermissionDialog = () => {
    setPermissionDialogOpen(false)
    setPermissionTarget(null)
    setAreaPermissions({})
    setPermissionError(null)
    setPermissionSaving(null)
  }

  const handlePermissionToggle = async (areaCode: string, field: PermissionField) => {
    if (!permissionTarget) return

    const current = getPermissionForArea(areaCode)
    const updated = { ...current, [field]: !current[field] }

    setPermissionSaving(areaCode)
    setPermissionError(null)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'permission',
          user_id: permissionTarget.user_id,
          area_code: areaCode,
          can_view: updated.can_view,
          can_create: updated.can_create,
          can_edit: updated.can_edit,
          can_delete: updated.can_delete,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '권한 업데이트에 실패했습니다.')
      }

      setAreaPermissions((prev) => ({ ...prev, [areaCode]: updated }))
      setSuccess('권한이 업데이트되었습니다.')
    } catch (err: any) {
      console.error('Permission update failed', err)
      setPermissionError(err.message || '권한 업데이트 중 오류가 발생했습니다.')
    } finally {
      setPermissionSaving(null)
    }
  }

  const handleResetPermission = async (areaCode: string) => {
    if (!permissionTarget) return
    setPermissionSaving(areaCode)
    setPermissionError(null)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/staff?user_id=${permissionTarget.user_id}&area_code=${areaCode}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '권한 초기화에 실패했습니다.')
      }

      const fallbackArea = permissionAreas.find((area) => area.area_code === areaCode)
      setAreaPermissions((prev) => ({
        ...prev,
        [areaCode]: {
          area_code: areaCode,
          area_name: fallbackArea?.area_name || areaCode,
          description: fallbackArea?.description ?? null,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        },
      }))
      setSuccess('해당 영역 권한이 초기화되었습니다.')
    } catch (err: any) {
      console.error('Permission reset failed', err)
      setPermissionError(err.message || '권한 초기화 중 오류가 발생했습니다.')
    } finally {
      setPermissionSaving(null)
    }
  }

  const handleSave = async () => {
    if (!editingStaff && !selectedUser) {
      setError('운영진으로 지정할 사용자를 선택해주세요.')
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = editingStaff
        ? {
            id: editingStaff.id,
            staff_role: formState.staff_role,
            staff_title: formState.staff_title || null,
            department: formState.department || null,
            is_active: formState.is_active,
            notes: formState.notes || null,
          }
        : {
            user_id: selectedUser?.user_id,
            staff_role: formState.staff_role,
            staff_title: formState.staff_title || null,
            department: formState.department || null,
            notes: formState.notes || null,
          }

      const method = editingStaff ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '저장에 실패했습니다.')
      }

      await fetchStaff()
      setSuccess(editingStaff ? '운영진 정보가 수정되었습니다.' : '새 운영진이 등록되었습니다.')
      resetForm()
    } catch (err: any) {
      console.error('Save failed', err)
      setError(err.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          is_active: !member.is_active,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '상태 변경에 실패했습니다.')
      }

      await fetchStaff()
      setSuccess('활성 상태가 변경되었습니다.')
    } catch (err: any) {
      console.error('Toggle failed', err)
      setError(err.message || '상태 변경 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (member: StaffMember) => {
    if (!confirm('운영진에서 제거하면 권한도 함께 삭제됩니다. 계속하시겠습니까?')) return

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/staff?id=${member.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '삭제에 실패했습니다.')
      }

      await fetchStaff()
      setSuccess('운영진이 삭제되었습니다.')
    } catch (err: any) {
      console.error('Delete failed', err)
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const visibleStaff = staff.filter((member) => {
    if (!searchTerm.trim()) return true
    const keyword = searchTerm.toLowerCase()
    return (
      member.email?.toLowerCase().includes(keyword) ||
      member.nickname?.toLowerCase().includes(keyword) ||
      member.full_name?.toLowerCase().includes(keyword) ||
      member.staff_role.toLowerCase().includes(keyword)
    )
  })

  const renderUserLabel = (user?: UserOption | null) => {
    if (!user) return ''
    return user.nickname || user.full_name || user.email || ''
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              운영진 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              기존 사용자에서 운영진을 지정하고 직책/부서를 설정합니다.
            </Typography>
          </Box>
          <Box flexGrow={1} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            disabled={actionLoading}
          >
            운영진 추가
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              운영진 목록
            </Typography>
            <TextField
              size="small"
              placeholder="이름, 닉네임, 이메일 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280, ml: 2 }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>사용자</TableCell>
                  <TableCell width={140}>직위</TableCell>
                  <TableCell width={160}>직책 / 부서</TableCell>
                  <TableCell width={120}>상태</TableCell>
                  <TableCell width={140}>임명일</TableCell>
                  <TableCell width={160} align="center">
                    관리
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleStaff.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={member.avatar_url || undefined} sx={{ width: 40, height: 40 }}>
                          {(member.nickname || member.full_name || member.email || '?')
                            .slice(0, 1)
                            .toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {member.nickname || member.full_name || member.username || '이름 없음'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {member.email || '-'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<ShieldIcon fontSize="small" />}
                        label={member.staff_role}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <BadgeIcon fontSize="small" color="disabled" />
                          <Typography variant="body2">
                            {member.staff_title || '직책 없음'}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {member.department || '부서 없음'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.is_active ? '활성' : '비활성'}
                        color={member.is_active ? 'success' : 'default'}
                        size="small"
                        icon={
                          member.is_active ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : (
                            <BlockIcon fontSize="small" />
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(member.appointed_at).toLocaleDateString('ko-KR')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          size="small"
                          aria-label="권한 편집"
                          onClick={() => handleOpenPermissions(member)}
                          disabled={actionLoading}
                        >
                          <ShieldIcon fontSize="small" color="primary" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(member)}
                          disabled={actionLoading}
                        >
                          {member.is_active ? (
                            <BlockIcon fontSize="small" color="action" />
                          ) : (
                            <CheckCircleIcon fontSize="small" color="success" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(member)}
                          disabled={actionLoading}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(member)}
                          disabled={actionLoading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {visibleStaff.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">등록된 운영진이 없습니다.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            )}
          </TableContainer>
        </Paper>

        <Dialog open={permissionDialogOpen} onClose={closePermissionDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            세부 권한 설정
            {permissionTarget && (
              <Typography variant="body2" color="text.secondary">
                {permissionTarget.nickname || permissionTarget.full_name || permissionTarget.email}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {permissionError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPermissionError(null)}>
                {permissionError}
              </Alert>
            )}
            {permissionDialogLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {permissionAreas.map((area) => {
                  const permissions = getPermissionForArea(area.area_code)
                  const isSaving = permissionSaving === area.area_code
                  return (
                    <Paper
                      key={area.area_code}
                      variant="outlined"
                      sx={{ p: 2, borderColor: 'divider' }}
                    >
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{area.area_name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {area.description || '설명 없음'}
                          </Typography>
                        </Box>
                        <Box flexGrow={1} />
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap rowGap={1}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={permissions.can_view}
                                onChange={() => handlePermissionToggle(area.area_code, 'can_view')}
                                disabled={isSaving}
                              />
                            }
                            label="조회"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={permissions.can_create}
                                onChange={() => handlePermissionToggle(area.area_code, 'can_create')}
                                disabled={isSaving}
                              />
                            }
                            label="생성"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={permissions.can_edit}
                                onChange={() => handlePermissionToggle(area.area_code, 'can_edit')}
                                disabled={isSaving}
                              />
                            }
                            label="수정"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={permissions.can_delete}
                                onChange={() => handlePermissionToggle(area.area_code, 'can_delete')}
                                disabled={isSaving}
                              />
                            }
                            label="삭제"
                          />
                        </Stack>
                      </Stack>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        spacing={1}
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {permissions.can_view ||
                          permissions.can_create ||
                          permissions.can_edit ||
                          permissions.can_delete
                            ? '직접 지정된 권한입니다. 영역별 권한은 즉시 적용됩니다.'
                            : '설정된 권한이 없으면 기본 역할 권한이 적용됩니다.'}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleResetPermission(area.area_code)}
                          disabled={isSaving}
                        >
                          초기화
                        </Button>
                      </Stack>
                    </Paper>
                  )
                })}

                {permissionAreas.length === 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography color="text.secondary">등록된 권한 영역이 없습니다.</Typography>
                  </Paper>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closePermissionDialog}>닫기</Button>
          </DialogActions>
        </Dialog>

        {/* Add / Edit dialog */}
        <Dialog open={dialogOpen} onClose={resetForm} maxWidth="sm" fullWidth>
          <DialogTitle>{editingStaff ? '운영진 정보 수정' : '새 운영진 추가'}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Autocomplete
                value={selectedUser}
                onChange={(_, value) => setSelectedUser(value)}
                onInputChange={(_, value) => setUserSearchTerm(value)}
                options={
                  selectedUser
                    ? [selectedUser, ...userOptions.filter((opt) => opt.user_id !== selectedUser.user_id)]
                    : userOptions
                }
                filterOptions={(options) => options}
                getOptionLabel={(option) => renderUserLabel(option)}
                loading={userSearchLoading}
                disabled={!!editingStaff}
                noOptionsText={userSearchTerm.length < 2 ? '두 글자 이상 입력해주세요.' : '검색 결과가 없습니다.'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="사용자 검색"
                    placeholder="이메일, 이름, 닉네임으로 검색"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {userSearchLoading ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    helperText={editingStaff ? '운영진 사용자 변경은 불가합니다.' : '운영진에서 제외된 사용자만 검색됩니다.'}
                  />
                )}
              />

              <TextField
                select
                label="직위"
                value={formState.staff_role}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, staff_role: e.target.value as StaffRole }))
                }
                fullWidth
                SelectProps={{ native: true }}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </TextField>

              <TextField
                label="직책"
                value={formState.staff_title}
                onChange={(e) => setFormState((prev) => ({ ...prev, staff_title: e.target.value }))}
                fullWidth
                placeholder="예: AI교육연구팀장"
              />

              <TextField
                label="부서"
                value={formState.department}
                onChange={(e) => setFormState((prev) => ({ ...prev, department: e.target.value }))}
                fullWidth
                placeholder="예: 연구개발본부"
              />

              <TextField
                label="메모 (선택)"
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formState.is_active}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    disabled={!editingStaff}
                  />
                }
                label="활성 상태"
              />
              {!editingStaff && (
                <Typography variant="caption" color="text.secondary">
                  신규 등록 시 기본 활성화됩니다. (추후 목록에서 비활성화 가능)
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetForm}>취소</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={actionLoading || (!editingStaff && !selectedUser)}
            >
              {actionLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : editingStaff ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}
