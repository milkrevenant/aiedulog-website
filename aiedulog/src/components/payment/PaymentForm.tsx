/**
 * Payment Form Component
 * Comprehensive payment form with Stripe Elements integration
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe, defaultElementsOptions, formatCurrency, handleStripeError, PAYMENT_CONFIG } from '@/lib/stripe-client'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
} from '@mui/material'
import {
  CreditCard,
  Security,
  CheckCircle,
  Error as ErrorIcon,
  Receipt,
  Info,
} from '@mui/icons-material'

interface PaymentFormProps {
  appointmentId: string
  amount: number
  currency?: string
  appointmentDetails?: {
    title: string
    date: string
    time: string
    duration: number
  }
  onSuccess?: (paymentResult: any) => void
  onError?: (error: string) => void
  onCancel?: () => void
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

// Inner component that uses Stripe hooks
function PaymentFormInner({ 
  appointmentId, 
  amount, 
  currency = 'KRW', 
  appointmentDetails,
  onSuccess, 
  onError, 
  onCancel 
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [savePaymentMethod, setSavePaymentMethod] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<any>(null)
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null)
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      country: 'KR',
      postal_code: '',
    },
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Create payment intent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId,
            savePaymentMethod,
          }),
        })

        const result = await response.json()

        if (!result.success) {
          setError(result.error)
          onError?.(result.error)
          return
        }

        setClientSecret(result.data.paymentIntent.client_secret)
        setPaymentIntent(result.data.paymentIntent)
        setPricingBreakdown(result.data.pricing)

        // Pre-fill billing details if available
        if (result.data.customer) {
          // You could fetch customer details here if needed
        }
      } catch (err) {
        const errorMessage = 'Failed to initialize payment. Please try again.'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }

    createPaymentIntent()
  }, [appointmentId, savePaymentMethod, onError])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card element not found')
      setProcessing(false)
      return
    }

    // Confirm payment with Stripe
    const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
        setup_future_usage: savePaymentMethod ? 'off_session' : undefined,
      }
    )

    if (stripeError) {
      setError(handleStripeError(stripeError))
      setProcessing(false)
      onError?.(handleStripeError(stripeError))
      return
    }

    if (confirmedPaymentIntent && confirmedPaymentIntent.status === 'succeeded') {
      setSucceeded(true)
      onSuccess?.(confirmedPaymentIntent)
    }

    setProcessing(false)
  }

  const handleBillingDetailsChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setBillingDetails(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }))
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  }

  if (succeeded) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="success.main">
            결제가 완료되었습니다!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {appointmentDetails?.title}에 대한 결제가 성공적으로 처리되었습니다.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Receipt />}
            onClick={() => window.print()}
            sx={{ mr: 2 }}
          >
            영수증 인쇄
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            확인
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardHeader
        title="결제 정보"
        subheader="안전한 결제 시스템으로 보호됩니다"
        avatar={<CreditCard />}
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <ErrorIcon sx={{ mr: 1 }} />
            {error}
          </Alert>
        )}

        {/* Pricing Breakdown */}
        {pricingBreakdown && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              결제 내역
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="기본 요금"
                  secondary={appointmentDetails?.title}
                />
                <Typography variant="body1">
                  {formatCurrency(pricingBreakdown.base_price, pricingBreakdown.currency)}
                </Typography>
              </ListItem>
              
              {pricingBreakdown.duration_fee > 0 && (
                <ListItem>
                  <ListItemText primary="추가 시간 요금" />
                  <Typography variant="body1">
                    {formatCurrency(pricingBreakdown.duration_fee, pricingBreakdown.currency)}
                  </Typography>
                </ListItem>
              )}
              
              {pricingBreakdown.early_bird_discount > 0 && (
                <ListItem>
                  <ListItemText
                    primary="조기 예약 할인"
                    secondary={`${pricingBreakdown.days_until_appointment}일 전 예약`}
                  />
                  <Typography variant="body1" color="success.main">
                    -{formatCurrency(pricingBreakdown.early_bird_discount, pricingBreakdown.currency)}
                  </Typography>
                </ListItem>
              )}
              
              {pricingBreakdown.late_booking_fee > 0 && (
                <ListItem>
                  <ListItemText
                    primary="긴급 예약 수수료"
                    secondary="24시간 이내 예약"
                  />
                  <Typography variant="body1" color="warning.main">
                    +{formatCurrency(pricingBreakdown.late_booking_fee, pricingBreakdown.currency)}
                  </Typography>
                </ListItem>
              )}
              
              <Divider sx={{ my: 1 }} />
              <ListItem>
                <ListItemText primary={<Typography variant="h6">총 결제 금액</Typography>} />
                <Typography variant="h6" color="primary">
                  {formatCurrency(pricingBreakdown.final_price, pricingBreakdown.currency)}
                </Typography>
              </ListItem>
            </List>
          </Paper>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Billing Details */}
            <Typography variant="h6">청구 정보</Typography>
            <Grid container spacing={2}>
              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  fullWidth
                  label="이름"
                  value={billingDetails.name}
                  onChange={(e) => handleBillingDetailsChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  fullWidth
                  label="이메일"
                  type="email"
                  value={billingDetails.email}
                  onChange={(e) => handleBillingDetailsChange('email', e.target.value)}
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="주소"
                  value={billingDetails.address.line1}
                  onChange={(e) => handleBillingDetailsChange('address.line1', e.target.value)}
                  required
                />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  fullWidth
                  label="도시"
                  value={billingDetails.address.city}
                  onChange={(e) => handleBillingDetailsChange('address.city', e.target.value)}
                  required
                />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  fullWidth
                  label="우편번호"
                  value={billingDetails.address.postal_code}
                  onChange={(e) => handleBillingDetailsChange('address.postal_code', e.target.value)}
                  required
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Card Details */}
            <Typography variant="h6">카드 정보</Typography>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <CardElement options={cardElementOptions} />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={savePaymentMethod}
                  onChange={(e) => setSavePaymentMethod(e.target.checked)}
                />
              }
              label="향후 결제를 위해 카드 정보 저장"
            />

            {/* Security Notice */}
            <Alert severity="info" icon={<Security />}>
              귀하의 결제 정보는 SSL 암호화를 통해 안전하게 보호되며, 
              결제는 Stripe을 통해 안전하게 처리됩니다.
            </Alert>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={processing}
                  sx={{ flex: 1 }}
                >
                  취소
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={!stripe || processing || !billingDetails.name || !billingDetails.email}
                sx={{ flex: 2 }}
                startIcon={processing ? <CircularProgress size={20} /> : <CreditCard />}
              >
                {processing 
                  ? '결제 처리 중...' 
                  : `${formatCurrency(amount, currency)} 결제하기`}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}

// Main wrapper component with Elements provider
export default function PaymentForm(props: PaymentFormProps) {
  const [stripePromise] = useState(() => getStripe())

  return (
    <Elements stripe={stripePromise} options={defaultElementsOptions}>
      <PaymentFormInner {...props} />
    </Elements>
  )
}