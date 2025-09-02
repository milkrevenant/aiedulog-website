/**
 * Admin Payment Management Page
 * Comprehensive payment administration interface
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import { formatCurrency } from '@/lib/stripe-client'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Tooltip,
  Badge,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Dashboard,
  Payment,
  TrendingUp,
  Receipt,
  Refresh,
  FilterList,
  Download,
  MoreVert,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Cancel,
  Info,
  Search,
  DateRange,
  AttachMoney,
  CreditCard,
  AccountBalance,
  Analytics,
  Warning,
} from '@mui/icons-material'

// Theme colors matching the existing design
const THEME_COLORS = {
  primary: '#2E86AB',
  secondary: '#A23B72', 
  tertiary: '#E6800F',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  grey: '#9e9e9e'
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  paymentMethodType: string
  description: string
  userEmail: string
  userName: string
  appointmentTitle?: string
  createdAt: string
  paidAt?: string
  refundedAmount: number
  stripePaymentIntentId: string
}

interface PaymentStats {
  totalRevenue: number
  totalTransactions: number
  successfulPayments: number
  failedPayments: number
  refundAmount: number
  averageTransactionValue: number
  currency: string
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

const statusConfig = {
  pending: { label: '대기', color: 'warning', icon: <Pending /> },
  processing: { label: '처리중', color: 'info', icon: <CircularProgress size={16} /> },
  succeeded: { label: '완료', color: 'success', icon: <CheckCircle /> },
  failed: { label: '실패', color: 'error', icon: <ErrorIcon /> },
  canceled: { label: '취소', color: 'default', icon: <Cancel /> },
  refunded: { label: '환불', color: 'info', icon: <Refresh /> },
  partially_refunded: { label: '부분환불', color: 'warning', icon: <Refresh /> },
}

function PaymentManagement() {
  // State management
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [actionMenu, setActionMenu] = useState<null | HTMLElement>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  const router = useRouter()

  // Fetch payments and stats
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFilter !== 'all') params.append('dateFilter', dateFilter)
      if (searchTerm) params.append('search', searchTerm)

      const [paymentsResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/payments?${params}`),
        fetch('/api/admin/payments/stats')
      ])

      const paymentsResult = await paymentsResponse.json()
      const statsResult = await statsResponse.json()

      if (paymentsResult.success) {
        setPayments(paymentsResult.data.payments)
        setTotalPages(Math.ceil(paymentsResult.data.total / itemsPerPage))
      }

      if (statsResult.success) {
        setStats(statsResult.data)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, dateFilter, searchTerm])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleRefund = async () => {
    if (!selectedPayment || !refundAmount) return

    try {
      setProcessing(true)
      const response = await fetch('/api/payments/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amount: parseInt(refundAmount) * 100, // Convert to cents
          description: refundReason,
        })
      })

      const result = await response.json()
      if (result.success) {
        setShowRefundDialog(false)
        setRefundAmount('')
        setRefundReason('')
        fetchPayments()
        alert('환불이 성공적으로 처리되었습니다.')
      } else {
        alert(`환불 처리 실패: ${result.error}`)
      }
    } catch (error) {
      alert('환불 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleExportData = () => {
    // Implement CSV export functionality
    const csvData = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      user: payment.userEmail,
      date: new Date(payment.createdAt).toLocaleDateString(),
      description: payment.description
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Stats Cards Component
  const StatsCards = () => {
    if (!stats) return null

    const cards = [
      {
        title: '총 수익',
        value: formatCurrency(stats.totalRevenue, stats.currency),
        icon: <TrendingUp />,
        color: THEME_COLORS.success,
        change: '+12.5%',
      },
      {
        title: '총 거래',
        value: stats.totalTransactions.toLocaleString(),
        icon: <Receipt />,
        color: THEME_COLORS.primary,
        change: '+8.2%',
      },
      {
        title: '성공률',
        value: `${((stats.successfulPayments / stats.totalTransactions) * 100).toFixed(1)}%`,
        icon: <CheckCircle />,
        color: THEME_COLORS.success,
        change: '+2.1%',
      },
      {
        title: '환불 금액',
        value: formatCurrency(stats.refundAmount, stats.currency),
        icon: <Refresh />,
        color: THEME_COLORS.warning,
        change: '-5.3%',
      },
      {
        title: '평균 거래액',
        value: formatCurrency(stats.averageTransactionValue, stats.currency),
        icon: <AttachMoney />,
        color: THEME_COLORS.tertiary,
        change: '+3.7%',
      },
    ]

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card, index) => (
          <Grid
            key={index}
            size={{
              xs: 12,
              sm: 6,
              md: "grow"
            }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Stack spacing={1}>
                      <Typography color="text.secondary" variant="body2">
                        {card.title}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color={card.color}>
                        {card.value}
                      </Typography>
                      <Chip
                        label={card.change}
                        size="small"
                        color={card.change.startsWith('+') ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Stack>
                    <Box
                      sx={{
                        backgroundColor: `${card.color}20`,
                        borderRadius: 2,
                        p: 1,
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Payment Table Component
  const PaymentTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>결제 ID</TableCell>
            <TableCell>사용자</TableCell>
            <TableCell>금액</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>결제수단</TableCell>
            <TableCell>생성일</TableCell>
            <TableCell align="right">작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} hover>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {payment.id.substring(0, 8)}...
                </Typography>
              </TableCell>
              <TableCell>
                <Stack>
                  <Typography variant="body2" fontWeight="medium">
                    {payment.userName || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {payment.userEmail}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Stack>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(payment.amount, payment.currency)}
                  </Typography>
                  {payment.refundedAmount > 0 && (
                    <Typography variant="caption" color="warning.main">
                      환불: {formatCurrency(payment.refundedAmount, payment.currency)}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Chip
                  icon={statusConfig[payment.status as keyof typeof statusConfig]?.icon}
                  label={statusConfig[payment.status as keyof typeof statusConfig]?.label || payment.status}
                  color={statusConfig[payment.status as keyof typeof statusConfig]?.color as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip label={payment.paymentMethodType} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Stack>
                  <Typography variant="body2">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(payment.createdAt).toLocaleTimeString()}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    setSelectedPayment(payment)
                    setActionMenu(e.currentTarget)
                  }}
                >
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {payments.length === 0 && !loading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Payment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            결제 내역이 없습니다
          </Typography>
        </Box>
      )}
    </TableContainer>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          결제 데이터 로딩 중...
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
                관리자
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <Payment sx={{ mr: 0.5 }} fontSize="inherit" />
                결제 관리
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  결제 관리 시스템
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  모든 결제, 환불, 거래 내역을 관리합니다
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleExportData}
                  disabled={payments.length === 0}
                >
                  데이터 내보내기
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={fetchPayments}
                  sx={{
                    background: `linear-gradient(45deg, ${THEME_COLORS.primary} 30%, ${THEME_COLORS.primary}BB 90%)`,
                  }}
                >
                  새로고침
                </Button>
              </Stack>
            </Stack>

            {/* Stats Cards */}
            <StatsCards />
          </Box>
        </motion.div>

        {/* Main Content */}
        <Card>
          <CardHeader
            title="결제 내역"
            action={
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={statusFilter}
                    label="상태"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="succeeded">완료</MenuItem>
                    <MenuItem value="pending">대기</MenuItem>
                    <MenuItem value="failed">실패</MenuItem>
                    <MenuItem value="refunded">환불</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>기간</InputLabel>
                  <Select
                    value={dateFilter}
                    label="기간"
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="today">오늘</MenuItem>
                    <MenuItem value="week">이번 주</MenuItem>
                    <MenuItem value="month">이번 달</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            }
          />
          <CardContent sx={{ p: 0 }}>
            <PaymentTable />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, page) => setCurrentPage(page)}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Action Menu */}
        <Menu
          anchorEl={actionMenu}
          open={Boolean(actionMenu)}
          onClose={() => setActionMenu(null)}
        >
          <MenuItem onClick={() => {
            setActionMenu(null)
            setShowDetailsDialog(true)
          }}>
            <ListItemIcon><Info /></ListItemIcon>
            <ListItemText>상세 보기</ListItemText>
          </MenuItem>
          {selectedPayment?.status === 'succeeded' && (
            <MenuItem onClick={() => {
              setActionMenu(null)
              setShowRefundDialog(true)
            }}>
              <ListItemIcon><Refresh /></ListItemIcon>
              <ListItemText>환불 처리</ListItemText>
            </MenuItem>
          )}
        </Menu>

        {/* Payment Details Dialog */}
        <Dialog
          open={showDetailsDialog}
          onClose={() => setShowDetailsDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>결제 상세 정보</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="text.secondary">결제 ID</Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {selectedPayment.id}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="text.secondary">상태</Typography>
                    <Chip
                      icon={statusConfig[selectedPayment.status as keyof typeof statusConfig]?.icon}
                      label={statusConfig[selectedPayment.status as keyof typeof statusConfig]?.label}
                      color={statusConfig[selectedPayment.status as keyof typeof statusConfig]?.color as any}
                      size="small"
                    />
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="text.secondary">금액</Typography>
                    <Typography variant="h6">
                      {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="subtitle2" color="text.secondary">결제 수단</Typography>
                    <Typography variant="body1">{selectedPayment.paymentMethodType}</Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="subtitle2" color="text.secondary">사용자</Typography>
                    <Typography variant="body1">
                      {selectedPayment.userName} ({selectedPayment.userEmail})
                    </Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="subtitle2" color="text.secondary">설명</Typography>
                    <Typography variant="body1">{selectedPayment.description}</Typography>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetailsDialog(false)}>닫기</Button>
          </DialogActions>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog
          open={showRefundDialog}
          onClose={() => setShowRefundDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>환불 처리</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="warning">
                환불 처리는 취소할 수 없습니다. 신중히 진행해주세요.
              </Alert>
              
              {selectedPayment && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>결제 정보</Typography>
                  <Typography variant="body2">
                    결제 금액: {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                  </Typography>
                  <Typography variant="body2">
                    환불 가능: {formatCurrency(selectedPayment.amount - selectedPayment.refundedAmount, selectedPayment.currency)}
                  </Typography>
                </Box>
              )}

              <TextField
                label="환불 금액"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                helperText="원 단위로 입력하세요"
                fullWidth
              />

              <TextField
                label="환불 사유"
                multiline
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRefundDialog(false)} disabled={processing}>
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleRefund}
              disabled={processing || !refundAmount}
              startIcon={processing ? <CircularProgress size={16} /> : <Refresh />}
            >
              {processing ? '처리 중...' : '환불 승인'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

export default function PaymentManagementPage() {
  return (
    <AuthGuard requireAuth requireAdmin>
      <PaymentManagement />
    </AuthGuard>
  )
}