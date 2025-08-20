'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { usePermission } from '@/hooks/usePermission'
import AppHeader from '@/components/AppHeader'
import AuthGuard from '@/components/AuthGuard'
import { notifyRoleChange } from '@/lib/notifications'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import VerifiedIcon from '@mui/icons-material/Verified'
import RefreshIcon from '@mui/icons-material/Refresh'
import FilterListIcon from '@mui/icons-material/FilterList'

type UserRole = 'admin' | 'moderator' | 'verified' | 'member'
type UserStatus = 'active' | 'suspended' | 'all'

interface User {
  id: string
  email: string
  username: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  is_active: boolean
}

const roleColors: Record<UserRole, 'error' | 'warning' | 'info' | 'success'> = {
  admin: 'error',
  moderator: 'warning',
  verified: 'info',
  member: 'success',
}

const roleIcons: Record<UserRole, React.ReactElement> = {
  admin: <AdminPanelSettingsIcon fontSize="small" />,
  moderator: <SupervisorAccountIcon fontSize="small" />,
  verified: <VerifiedIcon fontSize="small" />,
  member: <PersonIcon fontSize="small" />,
}

const roleLabels: Record<UserRole, string> = {
  admin: '관리자',
  moderator: '운영진',
  verified: '인증교사',
  member: '일반회원',
}

function UsersManagementContent() {
  const router = useRouter()
  const supabase = createClient()
  const { can, user: currentUser } = usePermission()
  const currentUserRole = currentUser?.role

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<UserStatus>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState<UserRole>('member')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 관리자 권한 체크
  useEffect(() => {
    if (currentUser && !can('manage_users')) {
      router.push('/feed')
    }
  }, [can, currentUser, router])

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

      // 필터링
      if (filterRole !== 'all') {
        query = query.eq('role', filterRole)
      }

      if (filterStatus !== 'all') {
        query = query.eq('is_active', filterStatus === 'active')
      }

      // 검색
      if (searchTerm) {
        query = query.or(
          `username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%`
        )
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filterRole, filterStatus])

  // 권한 변경
  const handleRoleChange = async () => {
    if (!selectedUser) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id)

      if (error) throw error

      // 권한 변경 알림 전송
      await notifyRoleChange(selectedUser.id, newRole)

      setSuccess(
        `${selectedUser.nickname || selectedUser.username}님의 권한이 ${roleLabels[newRole]}(으)로 변경되었습니다.`
      )
      setRoleDialogOpen(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 사용자 상태 변경
  const handleStatusToggle = async () => {
    if (!selectedUser) return

    setLoading(true)
    setError(null)

    try {
      const newStatus = !selectedUser.is_active

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', selectedUser.id)

      if (error) throw error

      setSuccess(
        `${selectedUser.nickname || selectedUser.username}님의 계정이 ${newStatus ? '활성화' : '비활성화'}되었습니다.`
      )
      setStatusDialogOpen(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // 필터된 사용자 목록
  const filteredUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (!can('manage_users')) {
    return null
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          {/* 헤더 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              사용자 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              가입된 사용자를 관리하고 권한을 설정합니다
            </Typography>
          </Box>

          {/* 알림 메시지 */}
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

          {/* 필터 및 검색 */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="이름, 이메일, 닉네임, 사용자명으로 검색"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
              sx={{ flex: 1, minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>권한 필터</InputLabel>
              <Select
                value={filterRole}
                label="권한 필터"
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              >
                <MenuItem value="all">모든 권한</MenuItem>
                <MenuItem value="admin">관리자</MenuItem>
                <MenuItem value="moderator">운영진</MenuItem>
                <MenuItem value="verified">인증교사</MenuItem>
                <MenuItem value="member">일반회원</MenuItem>
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={filterStatus}
              exclusive
              onChange={(e, newStatus) => newStatus && setFilterStatus(newStatus)}
              size="small"
            >
              <ToggleButton value="all">전체</ToggleButton>
              <ToggleButton value="active">활성</ToggleButton>
              <ToggleButton value="suspended">정지</ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              size="small"
            >
              새로고침
            </Button>
          </Box>

          {/* 사용자 테이블 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>사용자</TableCell>
                      <TableCell>이메일</TableCell>
                      <TableCell align="center">권한</TableCell>
                      <TableCell align="center">상태</TableCell>
                      <TableCell>가입일</TableCell>
                      <TableCell>마지막 로그인</TableCell>
                      <TableCell align="center">작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              src={user.avatar_url || undefined}
                              sx={{ width: 32, height: 32 }}
                            >
                              {user.username?.[0]?.toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {user.nickname || user.username}
                              </Typography>
                              {user.full_name && (
                                <Typography variant="caption" color="text.secondary">
                                  {user.full_name}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{user.email}</Typography>
                          {!user.email_confirmed_at && (
                            <Chip label="미인증" size="small" color="warning" sx={{ mt: 0.5 }} />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={roleIcons[user.role]}
                            label={roleLabels[user.role]}
                            size="small"
                            color={roleColors[user.role]}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={user.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                            label={user.is_active ? '활성' : '정지'}
                            size="small"
                            color={user.is_active ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(user.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {user.last_sign_in_at
                              ? new Date(user.last_sign_in_at).toLocaleDateString()
                              : '없음'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="권한 변경">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setNewRole(user.role)
                                  setRoleDialogOpen(true)
                                }}
                                disabled={user.role === 'admin' && currentUserRole !== 'admin'}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={user.is_active ? '계정 정지' : '계정 활성화'}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setStatusDialogOpen(true)
                                }}
                                disabled={user.role === 'admin' && currentUserRole !== 'admin'}
                              >
                                {user.is_active ? (
                                  <BlockIcon fontSize="small" />
                                ) : (
                                  <CheckCircleIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={users.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="페이지당 행:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}명`}
              />
            </>
          )}
        </Paper>
      </Container>

      {/* 권한 변경 다이얼로그 */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>권한 변경</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {selectedUser?.nickname || selectedUser?.username}님의 권한을 변경합니다.
            {selectedUser?.role === 'admin' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                관리자 권한 변경은 신중하게 진행해주세요.
              </Alert>
            )}
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>새 권한</InputLabel>
            <Select
              value={newRole}
              label="새 권한"
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <MenuItem value="member">일반회원</MenuItem>
              <MenuItem value="verified">인증교사</MenuItem>
              <MenuItem value="moderator">운영진</MenuItem>
              {currentUserRole === 'admin' && <MenuItem value="admin">관리자</MenuItem>}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>취소</Button>
          <Button onClick={handleRoleChange} variant="contained" disabled={loading}>
            변경
          </Button>
        </DialogActions>
      </Dialog>

      {/* 상태 변경 다이얼로그 */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>계정 {selectedUser?.is_active ? '정지' : '활성화'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedUser?.nickname || selectedUser?.username}님의 계정을{' '}
            {selectedUser?.is_active ? '정지' : '활성화'}하시겠습니까?
            {selectedUser?.is_active && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                계정을 정지하면 해당 사용자는 로그인할 수 없습니다.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleStatusToggle}
            variant="contained"
            color={selectedUser?.is_active ? 'error' : 'success'}
            disabled={loading}
          >
            {selectedUser?.is_active ? '정지' : '활성화'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
export default function UsersManagementPage() {
  return (
    <AuthGuard requireAuth requireAdmin>
      <UsersManagementContent />
    </AuthGuard>
  )
}
