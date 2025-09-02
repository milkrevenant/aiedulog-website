/**
 * Appointment Payment Page
 * Handles payment processing for specific appointments
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import PaymentForm from '@/components/payment/PaymentForm'
import { formatCurrency } from '@/lib/stripe-client'
import {
  Box,
  Container,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  Button,
  Paper,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Breadcrumbs,
  Link,
} from '@mui/material'
import {
  CalendarToday,
  Schedule,
  Person,
  Payment,
  CheckCircle,
  Error as ErrorIcon,
  ArrowBack,
  Security,
  Info,
} from '@mui/icons-material'

interface AppointmentDetails {
  id: string
  title: string
  description: string
  appointment_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: string
  payment_status: string
  payment_amount: number
  payment_currency: string
  payment_required: boolean
  appointment_types: {
    type_name: string
    description: string
    requires_payment: boolean
    default_price: number
    cancellation_policy: string
    refund_policy: string
  }
  instructor: {
    display_name: string
    email: string
    first_name: string
    last_name: string
  }
}

interface PricingBreakdown {
  base_price: number
  duration_fee: number
  early_bird_discount: number
  late_booking_fee: number
  final_price: number
  currency: string
  days_until_appointment: number
}

const steps = [
  {
    label: '예약 확인',
    description: '예약 정보를 확인합니다',
  },
  {
    label: '결제 정보',
    description: '결제 수단을 입력합니다',
  },
  {
    label: '결제 완료',
    description: '결제가 완료됩니다',
  },
]

function AppointmentPayment() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  useEffect(() => {
    fetchAppointmentDetails()
  }, [appointmentId])

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true)
      
      // Fetch appointment details
      const appointmentResponse = await fetch(`/api/appointments/${appointmentId}`)
      const appointmentResult = await appointmentResponse.json()

      if (!appointmentResult.success) {
        setError(appointmentResult.error || '예약 정보를 불러올 수 없습니다.')
        return
      }

      const appointmentData = appointmentResult.data
      setAppointment(appointmentData)

      // Check if payment is required
      if (!appointmentData.appointment_types?.requires_payment) {
        setError('이 예약은 결제가 필요하지 않습니다.')
        return
      }

      // Check if already paid
      if (appointmentData.payment_status === 'succeeded') {
        setPaymentCompleted(true)
        setActiveStep(2)
        return
      }

      // Fetch pricing information
      const pricingResponse = await fetch('/api/appointments/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentTypeId: appointmentData.appointment_type_id,
          appointmentDate: appointmentData.appointment_date,
          durationMinutes: appointmentData.duration_minutes,
        }),
      })

      const pricingResult = await pricingResponse.json()
      if (pricingResult.success) {
        setPricing(pricingResult.data)
        setActiveStep(1) // Ready for payment
      }

    } catch (err) {
      setError('예약 정보를 불러오는 중 오류가 발생했습니다.')
      console.error('Error fetching appointment:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentResult: any) => {
    setPaymentCompleted(true)
    setActiveStep(2)
    
    // Update appointment status
    setAppointment(prev => prev ? {
      ...prev,
      payment_status: 'succeeded',
      status: 'confirmed'
    } : null)
  }

  const handlePaymentError = (error: string) => {
    setError(error)
  }

  const handleBackToAppointments = () => {
    router.push('/appointments')
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={60} />
              <Typography variant="h6">예약 정보 로딩 중...</Typography>
            </Stack>
          </Box>
        </Container>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AppHeader />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                오류가 발생했습니다
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {error}
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="outlined" onClick={() => router.back()}>
                  돌아가기
                </Button>
                <Button variant="contained" onClick={fetchAppointmentDetails}>
                  다시 시도
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </>
    )
  }

  if (!appointment) {
    return (
      <>
        <AppHeader />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">
            예약 정보를 찾을 수 없습니다.
          </Alert>
        </Container>
      </>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link href="/appointments" underline="hover" color="inherit">
                <CalendarToday sx={{ mr: 0.5 }} fontSize="inherit" />
                내 예약
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <Payment sx={{ mr: 0.5 }} fontSize="inherit" />
                결제
              </Typography>
            </Breadcrumbs>
            
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBackToAppointments}
              >
                돌아가기
              </Button>
              <Typography variant="h4" fontWeight="bold">
                예약 결제
              </Typography>
            </Stack>
          </Box>
        </motion.div>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
          {/* Left Column - Progress and Appointment Details */}
          <Box sx={{ flex: { lg: 1 } }}>
            {/* Progress Stepper */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  결제 진행 상황
                </Typography>
                <Stepper activeStep={activeStep} orientation="vertical">
                  {steps.map((step, index) => (
                    <Step key={step.label}>
                      <StepLabel>{step.label}</StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader title="예약 정보" />
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {appointment.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {appointment.description}
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <CalendarToday color="primary" />
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {new Date(appointment.appointment_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {appointment.start_time} - {appointment.end_time} ({appointment.duration_minutes}분)
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Person color="primary" />
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {appointment.instructor?.display_name || 
                           `${appointment.instructor?.first_name} ${appointment.instructor?.last_name}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          강사
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Info color="primary" />
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {appointment.appointment_types?.type_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          서비스 유형
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  {/* Payment Status */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      결제 상태
                    </Typography>
                    <Chip
                      icon={paymentCompleted ? <CheckCircle /> : <Schedule />}
                      label={paymentCompleted ? '결제 완료' : '결제 대기'}
                      color={paymentCompleted ? 'success' : 'warning'}
                    />
                  </Box>

                  {/* Policies */}
                  {appointment.appointment_types && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        취소 및 환불 정책
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>취소 정책:</strong> {appointment.appointment_types.cancellation_policy}
                        </Typography>
                        <Typography variant="body2">
                          <strong>환불 정책:</strong> {appointment.appointment_types.refund_policy}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>

          {/* Right Column - Payment Form */}
          <Box sx={{ flex: { lg: 1 } }}>
            {paymentCompleted ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom color="success.main">
                    결제가 완료되었습니다!
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    예약이 확정되었습니다. 예약 일정에 맞춰 참석해 주세요.
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    예약 확인 이메일이 발송되었습니다. 스팸 폴더도 확인해 주세요.
                  </Alert>

                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="outlined"
                      onClick={handleBackToAppointments}
                    >
                      내 예약 보기
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => window.print()}
                    >
                      영수증 인쇄
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <>
                {pricing && (
                  <PaymentForm
                    appointmentId={appointmentId}
                    amount={pricing.final_price}
                    currency={pricing.currency}
                    appointmentDetails={{
                      title: appointment.title,
                      date: appointment.appointment_date,
                      time: appointment.start_time,
                      duration: appointment.duration_minutes,
                    }}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onCancel={handleBackToAppointments}
                  />
                )}

                {/* Security Notice */}
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Security color="primary" />
                      <Typography variant="h6">
                        안전한 결제
                      </Typography>
                    </Stack>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="SSL 암호화"
                          secondary="모든 데이터가 안전하게 암호화됩니다"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="PCI DSS 준수"
                          secondary="최고 수준의 보안 표준을 준수합니다"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Stripe 결제"
                          secondary="전세계적으로 신뢰받는 결제 시스템"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        </Box>
      </Container>
    </>
  )
}

export default function AppointmentPaymentPage() {
  return (
    <AuthGuard requireAuth>
      <AppointmentPayment />
    </AuthGuard>
  )
}