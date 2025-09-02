/**
 * Payment Method Manager Component
 * Manages user's saved payment methods
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe, defaultElementsOptions, formatPaymentMethod, handleStripeError } from '@/lib/stripe-client'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Skeleton,
  Divider,
} from '@mui/material'
import {
  CreditCard,
  Add,
  Delete,
  Star,
  StarBorder,
  Security,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material'

interface PaymentMethod {
  id: string
  stripeId: string
  type: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  lastUsedAt?: string
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
}

interface PaymentMethodManagerProps {
  onPaymentMethodSelected?: (paymentMethod: PaymentMethod) => void
  allowSelection?: boolean
  showAddButton?: boolean
}

// Component for adding new payment method
function AddPaymentMethodForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: (paymentMethod: any) => void
  onCancel: () => void 
}) {
  const stripe = useStripe()
  const elements = useElements()
  
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
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

    // Create payment method
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    })

    if (stripeError) {
      setError(handleStripeError(stripeError))
      setProcessing(false)
      return
    }

    try {
      // Save payment method to backend
      const response = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          setAsDefault: false,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error)
        setProcessing(false)
        return
      }

      onSuccess(result.data.paymentMethod)
    } catch (err) {
      setError('결제 수단 저장에 실패했습니다.')
      setProcessing(false)
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
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          새로운 결제 수단을 추가하세요. 카드 정보는 안전하게 암호화되어 저장됩니다.
        </Typography>

        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <CardElement options={cardElementOptions} />
        </Box>

        <Alert severity="info" icon={<Security />}>
          모든 결제 정보는 PCI DSS 인증을 받은 Stripe을 통해 안전하게 처리됩니다.
        </Alert>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={processing}
            sx={{ flex: 1 }}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!stripe || processing}
            sx={{ flex: 1 }}
            startIcon={processing ? <CircularProgress size={16} /> : <Add />}
          >
            {processing ? '저장 중...' : '결제 수단 추가'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

// Main Payment Method Manager Component
function PaymentMethodManagerInner({ 
  onPaymentMethodSelected, 
  allowSelection = false,
  showAddButton = true 
}: PaymentMethodManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/methods')
      const result = await response.json()

      if (result.success) {
        setPaymentMethods(result.data.paymentMethods)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('결제 수단을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      setProcessingAction(paymentMethodId)
      const response = await fetch('/api/payments/methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchPaymentMethods() // Refresh the list
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('기본 결제 수단 설정에 실패했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('이 결제 수단을 삭제하시겠습니까?')) {
      return
    }

    try {
      setProcessingAction(paymentMethodId)
      const response = await fetch('/api/payments/methods', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchPaymentMethods() // Refresh the list
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('결제 수단 삭제에 실패했습니다.')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleAddSuccess = (newPaymentMethod: PaymentMethod) => {
    setShowAddDialog(false)
    fetchPaymentMethods() // Refresh the list
  }

  const getPaymentMethodIcon = (type: string, brand?: string) => {
    // You could customize icons based on card brand
    return <CreditCard />
  }

  const getPaymentMethodDisplay = (paymentMethod: PaymentMethod) => {
    if (paymentMethod.type === 'card') {
      return `${paymentMethod.brand?.toUpperCase()} •••• ${paymentMethod.last4}`
    }
    return paymentMethod.type
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="결제 수단" />
        <CardContent>
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} />
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
          title="결제 수단"
          subheader="저장된 결제 수단을 관리하세요"
          action={
            showAddButton && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setShowAddDialog(true)}
              >
                추가
              </Button>
            )
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {paymentMethods.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CreditCard sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                저장된 결제 수단이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                결제 수단을 추가하면 더 빠르고 편리하게 결제할 수 있습니다.
              </Typography>
              {showAddButton && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowAddDialog(true)}
                >
                  첫 번째 결제 수단 추가
                </Button>
              )}
            </Box>
          ) : (
            <List>
              {paymentMethods.map((method, index) => (
                <React.Fragment key={method.id}>
                  <ListItem
                    onClick={allowSelection ? () => onPaymentMethodSelected?.(method) : undefined}
                    sx={{
                      cursor: allowSelection ? 'pointer' : 'default',
                      borderRadius: 1,
                      mb: 1,
                      border: method.isDefault ? 2 : 1,
                      borderColor: method.isDefault ? 'primary.main' : 'divider',
                      bgcolor: method.isDefault ? 'primary.50' : 'background.paper',
                    }}
                  >
                    <ListItemIcon>
                      {getPaymentMethodIcon(method.type, method.brand)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body1">
                            {getPaymentMethodDisplay(method)}
                          </Typography>
                          {method.isDefault && (
                            <Chip
                              label="기본"
                              size="small"
                              color="primary"
                              variant="filled"
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {method.expiryMonth && method.expiryYear && 
                              `만료: ${method.expiryMonth.toString().padStart(2, '0')}/${method.expiryYear}`}
                          </Typography>
                          {method.lastUsedAt && (
                            <Typography variant="caption" color="text.secondary">
                              마지막 사용: {new Date(method.lastUsedAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        {!method.isDefault && (
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetDefault(method.id)
                            }}
                            disabled={processingAction === method.id}
                            title="기본 결제 수단으로 설정"
                          >
                            {processingAction === method.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <StarBorder />
                            )}
                          </IconButton>
                        )}
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(method.id)
                          }}
                          disabled={processingAction === method.id}
                          color="error"
                          title="결제 수단 삭제"
                        >
                          {processingAction === method.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Delete />
                          )}
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < paymentMethods.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Method Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Add />
            <Typography variant="h6">새 결제 수단 추가</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Elements stripe={getStripe()} options={defaultElementsOptions}>
            <AddPaymentMethodForm
              onSuccess={handleAddSuccess}
              onCancel={() => setShowAddDialog(false)}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Wrapper component with Elements provider
export default function PaymentMethodManager(props: PaymentMethodManagerProps) {
  return <PaymentMethodManagerInner {...props} />
}