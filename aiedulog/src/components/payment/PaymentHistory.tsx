/**
 * Payment History Component
 * Displays user's payment history and transaction details
 */

'use client'

import React, { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/stripe-client'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Skeleton,
  Paper,
} from '@mui/material'
import {
  Receipt,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Cancel,
  Refresh,
  Info,
  CalendarToday,
  Payment,
  MoreVert,
  Download,
  Print,
} from '@mui/icons-material'

interface PaymentHistoryItem {
  id: string
  amount: number
  currency: string
  description: string
  status: string
  paymentMethodType: string
  createdAt: string
  paidAt?: string
  failedAt?: string
  canceledAt?: string
  refundedAmount: number
  receiptUrl?: string
  appointment?: {
    id: string
    title: string
    date: string
    time: string
  }
  refunds?: RefundItem[]
}

interface RefundItem {
  id: string
  amount: number
  currency: string
  reason?: string
  status: string
  processedAt?: string
  createdAt: string
}

interface PaymentHistoryProps {
  userId?: string
  appointmentId?: string
  showRefundButton?: boolean
}

const statusConfig = {
  pending: {
    label: '대기 중',
    color: 'warning' as const,
    icon: <Pending />,
  },
  processing: {
    label: '처리 중',
    color: 'info' as const,
    icon: <CircularProgress size={16} />,
  },
  succeeded: {
    label: '완료',
    color: 'success' as const,
    icon: <CheckCircle />,
  },
  failed: {
    label: '실패',
    color: 'error' as const,
    icon: <ErrorIcon />,
  },
  canceled: {
    label: '취소',
    color: 'default' as const,
    icon: <Cancel />,
  },
  refunded: {
    label: '환불',
    color: 'info' as const,
    icon: <Refresh />,
  },
  partially_refunded: {
    label: '부분 환불',
    color: 'warning' as const,
    icon: <Refresh />,
  },
}

export default function PaymentHistory({ 
  userId, 
  appointmentId, 
  showRefundButton = false 
}: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundAmount, setRefundAmount] = useState<number | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundProcessing, setRefundProcessing] = useState(false)
  
  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (appointmentId) {
        params.append('appointmentId', appointmentId)
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (dateRange !== 'all') {
        // Add date range logic here
      }

      const response = await fetch(`/api/payments?${params}`)
      const result = await response.json()

      if (result.success) {
        setPayments(result.data.payments)
        setTotalPages(Math.ceil(result.data.total / itemsPerPage))
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('결제 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [currentPage, statusFilter, dateRange, appointmentId])

  const handleRefund = async () => {
    if (!selectedPayment) return

    try {
      setRefundProcessing(true)
      const response = await fetch('/api/payments/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amount: refundAmount || undefined,
          reason: 'requested_by_customer',
          description: refundReason,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setShowRefundDialog(false)
        setRefundAmount(null)
        setRefundReason('')
        await fetchPayments() // Refresh the list
        alert('환불 요청이 성공적으로 처리되었습니다.')
      } else {
        alert(`환불 요청 실패: ${result.error}`)
      }
    } catch (err) {
      alert('환불 요청 중 오류가 발생했습니다.')
    } finally {
      setRefundProcessing(false)
    }
  }

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const getRefundableAmount = (payment: PaymentHistoryItem) => {
    return payment.amount - payment.refundedAmount
  }

  const canRefund = (payment: PaymentHistoryItem) => {
    return payment.status === 'succeeded' && getRefundableAmount(payment) > 0
  }

  const PaymentListItem = ({ payment }: { payment: PaymentHistoryItem }) => {
    const status = getStatusConfig(payment.status)

    return (
      <ListItem
        sx={{
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 1,
          bgcolor: 'background.paper',
        }}
      >
        <ListItemIcon>
          {status.icon}
        </ListItemIcon>
        <ListItemText
          primary={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body1" fontWeight="medium">
                {formatCurrency(payment.amount, payment.currency)}
              </Typography>
              <Chip
                label={status.label}
                color={status.color}
                size="small"
              />
              {payment.refundedAmount > 0 && (
                <Chip
                  label={`환불 ${formatCurrency(payment.refundedAmount, payment.currency)}`}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          }
          secondary={
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.primary">
                {payment.description}
              </Typography>
              {payment.appointment && (
                <Typography variant="caption" color="text.secondary">
                  {payment.appointment.title} - {payment.appointment.date} {payment.appointment.time}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {new Date(payment.createdAt).toLocaleString('ko-KR')}
              </Typography>
            </Stack>
          }
        />
        <ListItemSecondaryAction>
          <Stack direction="row" spacing={1}>
            {payment.receiptUrl && (
              <IconButton
                size="small"
                onClick={() => window.open(payment.receiptUrl, '_blank')}
                title="영수증 보기"
              >
                <Receipt />
              </IconButton>
            )}
            {showRefundButton && canRefund(payment) && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSelectedPayment(payment)
                  setRefundAmount(getRefundableAmount(payment))
                  setShowRefundDialog(true)
                }}
              >
                환불
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => {
                setSelectedPayment(payment)
                setShowDetailsDialog(true)
              }}
            >
              <Info />
            </IconButton>
          </Stack>
        </ListItemSecondaryAction>
      </ListItem>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="결제 내역" />
        <CardContent>
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={80} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader
          title="결제 내역"
          subheader="모든 결제 내역과 환불 정보를 확인하세요"
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                label="상태"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="succeeded">완료</MenuItem>
                <MenuItem value="pending">대기 중</MenuItem>
                <MenuItem value="failed">실패</MenuItem>
                <MenuItem value="refunded">환불</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>기간</InputLabel>
              <Select
                value={dateRange}
                label="기간"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="today">오늘</MenuItem>
                <MenuItem value="week">최근 7일</MenuItem>
                <MenuItem value="month">최근 30일</MenuItem>
                <MenuItem value="year">최근 1년</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchPayments}
            >
              새로고침
            </Button>
          </Stack>

          {/* Payment List */}
          {payments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Payment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                결제 내역이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary">
                아직 결제한 내역이 없습니다.
              </Typography>
            </Box>
          ) : (
            <>
              <List sx={{ mb: 2 }}>
                {payments.map((payment) => (
                  <PaymentListItem key={payment.id} payment={payment} />
                ))}
              </List>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(_, page) => setCurrentPage(page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Info />
            <Typography variant="h6">결제 상세 정보</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  {getStatusConfig(selectedPayment.status).icon}
                  <Chip
                    label={getStatusConfig(selectedPayment.status).label}
                    color={getStatusConfig(selectedPayment.status).color}
                    size="small"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {selectedPayment.description}
                </Typography>
              </Paper>

              <Stack spacing={1}>
                <Typography variant="subtitle2">결제 정보</Typography>
                <Typography variant="body2">
                  결제 수단: {selectedPayment.paymentMethodType}
                </Typography>
                <Typography variant="body2">
                  결제일: {new Date(selectedPayment.createdAt).toLocaleString('ko-KR')}
                </Typography>
                {selectedPayment.paidAt && (
                  <Typography variant="body2">
                    완료일: {new Date(selectedPayment.paidAt).toLocaleString('ko-KR')}
                  </Typography>
                )}
                {selectedPayment.refundedAmount > 0 && (
                  <Typography variant="body2" color="info.main">
                    환불 금액: {formatCurrency(selectedPayment.refundedAmount, selectedPayment.currency)}
                  </Typography>
                )}
              </Stack>

              {selectedPayment.appointment && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">예약 정보</Typography>
                  <Typography variant="body2">
                    {selectedPayment.appointment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPayment.appointment.date} {selectedPayment.appointment.time}
                  </Typography>
                </Stack>
              )}

              {selectedPayment.refunds && selectedPayment.refunds.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">환불 내역</Typography>
                  {selectedPayment.refunds.map((refund) => (
                    <Paper key={refund.id} variant="outlined" sx={{ p: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">
                          {formatCurrency(refund.amount, refund.currency)}
                        </Typography>
                        <Chip
                          label={refund.status}
                          size="small"
                          color={refund.status === 'succeeded' ? 'success' : 'warning'}
                        />
                      </Stack>
                      {refund.reason && (
                        <Typography variant="caption" color="text.secondary">
                          사유: {refund.reason}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {refund.processedAt 
                          ? `처리됨: ${new Date(refund.processedAt).toLocaleString('ko-KR')}`
                          : `요청일: ${new Date(refund.createdAt).toLocaleString('ko-KR')}`
                        }
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog
        open={showRefundDialog}
        onClose={() => setShowRefundDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>환불 요청</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              환불 요청을 처리합니다. 환불 금액은 원래 결제 수단으로 3-5 영업일 내에 반환됩니다.
            </Alert>

            {selectedPayment && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  원결제 정보
                </Typography>
                <Typography variant="body2">
                  결제 금액: {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </Typography>
                <Typography variant="body2">
                  환불 가능 금액: {formatCurrency(getRefundableAmount(selectedPayment), selectedPayment.currency)}
                </Typography>
              </Paper>
            )}

            <TextField
              label="환불 금액"
              type="number"
              value={refundAmount || ''}
              onChange={(e) => setRefundAmount(Number(e.target.value) || null)}
              helperText={`최대 ${formatCurrency(getRefundableAmount(selectedPayment || {} as PaymentHistoryItem), selectedPayment?.currency || 'KRW')} 환불 가능`}
              InputProps={{
                endAdornment: selectedPayment?.currency,
              }}
              fullWidth
            />

            <TextField
              label="환불 사유 (선택사항)"
              multiline
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="환불 사유를 입력해주세요..."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowRefundDialog(false)}
            disabled={refundProcessing}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleRefund}
            disabled={refundProcessing || !refundAmount || refundAmount <= 0}
            startIcon={refundProcessing ? <CircularProgress size={16} /> : <Refresh />}
          >
            {refundProcessing ? '처리 중...' : '환불 요청'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}