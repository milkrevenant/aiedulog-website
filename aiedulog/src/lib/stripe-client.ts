/**
 * Client-side Stripe Integration
 * Handles client-side Stripe operations and Elements
 */

'use client'

import { loadStripe, Stripe, StripeElements, StripeElementsOptions } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

/**
 * Get Stripe instance (singleton pattern)
 */
export function getStripe() {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    
    if (!publishableKey) {
      throw new Error('Stripe publishable key is not configured')
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

/**
 * Default Stripe Elements options
 */
export const defaultElementsOptions: StripeElementsOptions = {
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#2E86AB',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: '"Noto Sans KR", system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '16px',
      },
      '.Input:focus': {
        borderColor: '#2E86AB',
        boxShadow: '0 0 0 2px rgba(46, 134, 171, 0.1)',
      },
      '.Label': {
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '8px',
        color: '#374151',
      },
    },
  },
  locale: 'ko',
}

/**
 * Payment method types configuration
 */
export const paymentMethodTypes = {
  card: {
    name: '카드 결제',
    description: '신용카드 또는 체크카드로 결제',
    icon: '💳',
  },
  apple_pay: {
    name: 'Apple Pay',
    description: 'Apple Pay로 간편 결제',
    icon: '🍎',
  },
  google_pay: {
    name: 'Google Pay',
    description: 'Google Pay로 간편 결제',
    icon: '🔍',
  },
}

/**
 * Currency formatting for display
 */
export function formatCurrency(amount: number, currency: string = 'KRW'): string {
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: currency.toLowerCase() === 'krw' ? 0 : 2,
  })

  // Convert from cents/smallest unit to main currency unit
  const divisor = currency.toLowerCase() === 'krw' ? 1 : 100
  return formatter.format(amount / divisor)
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(paymentMethod: {
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}): string {
  if (paymentMethod.type === 'card' && paymentMethod.card) {
    const { brand, last4, exp_month, exp_year } = paymentMethod.card
    const brandName = brand.charAt(0).toUpperCase() + brand.slice(1)
    return `${brandName} •••• ${last4} (${exp_month.toString().padStart(2, '0')}/${exp_year.toString().slice(-2)})`
  }

  return paymentMethodTypes[paymentMethod.type as keyof typeof paymentMethodTypes]?.name || paymentMethod.type
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number, currency: string = 'KRW'): {
  isValid: boolean
  error?: string
} {
  const minAmounts: Record<string, number> = {
    KRW: 100, // 100 KRW minimum
    USD: 50,  // $0.50 minimum
    EUR: 50,  // €0.50 minimum
    JPY: 50,  // ¥50 minimum
  }

  const maxAmounts: Record<string, number> = {
    KRW: 1000000000, // 10 million KRW maximum
    USD: 99999900,   // $999,999.00 maximum
    EUR: 99999900,   // €999,999.00 maximum
    JPY: 99999900,   // ¥999,999 maximum
  }

  const currencyUpper = currency.toUpperCase()
  const minAmount = minAmounts[currencyUpper] || minAmounts.KRW
  const maxAmount = maxAmounts[currencyUpper] || maxAmounts.KRW

  if (amount < minAmount) {
    return {
      isValid: false,
      error: `최소 결제 금액은 ${formatCurrency(minAmount, currency)}입니다.`,
    }
  }

  if (amount > maxAmount) {
    return {
      isValid: false,
      error: `최대 결제 금액은 ${formatCurrency(maxAmount, currency)}입니다.`,
    }
  }

  return { isValid: true }
}

/**
 * Get card brand icon
 */
export function getCardBrandIcon(brand: string): string {
  const brandIcons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
    diners: '💳',
    jcb: '💳',
    unionpay: '💳',
    unknown: '💳',
  }

  return brandIcons[brand.toLowerCase()] || brandIcons.unknown
}

/**
 * Handle Stripe errors for user display
 */
export function handleStripeError(error: any): string {
  if (error?.type === 'card_error') {
    switch (error.code) {
      case 'card_declined':
        return '카드가 거절되었습니다. 다른 결제 방법을 시도해보세요.'
      case 'insufficient_funds':
        return '잔액이 부족합니다. 다른 카드를 사용하거나 잔액을 확인해보세요.'
      case 'incorrect_cvc':
        return 'CVC 번호가 올바르지 않습니다.'
      case 'expired_card':
        return '카드가 만료되었습니다. 다른 카드를 사용해보세요.'
      case 'incorrect_number':
        return '카드 번호가 올바르지 않습니다.'
      case 'processing_error':
        return '결제 처리 중 오류가 발생했습니다. 다시 시도해보세요.'
      default:
        return error.message || '카드 결제 중 오류가 발생했습니다.'
    }
  }

  if (error?.type === 'validation_error') {
    return '입력한 정보가 올바르지 않습니다. 다시 확인해보세요.'
  }

  if (error?.type === 'api_connection_error') {
    return '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해보세요.'
  }

  if (error?.type === 'api_error') {
    return '결제 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해보세요.'
  }

  if (error?.type === 'rate_limit_error') {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해보세요.'
  }

  return error?.message || '결제 처리 중 알 수 없는 오류가 발생했습니다.'
}

/**
 * Create payment method display text
 */
export function createPaymentMethodDisplay(paymentMethod: any): {
  title: string
  subtitle: string
  icon: string
} {
  if (paymentMethod.type === 'card' && paymentMethod.card) {
    return {
      title: `${paymentMethod.card.brand.toUpperCase()} •••• ${paymentMethod.card.last4}`,
      subtitle: `${paymentMethod.card.exp_month.toString().padStart(2, '0')}/${paymentMethod.card.exp_year}`,
      icon: getCardBrandIcon(paymentMethod.card.brand),
    }
  }

  const methodInfo = paymentMethodTypes[paymentMethod.type as keyof typeof paymentMethodTypes]
  return {
    title: methodInfo?.name || paymentMethod.type,
    subtitle: methodInfo?.description || '',
    icon: methodInfo?.icon || '💳',
  }
}

/**
 * Check if browser supports payment request API
 */
export async function canMakePayment(): Promise<{
  applePay: boolean
  googlePay: boolean
  paymentRequest: boolean
}> {
  const stripe = await getStripe()
  
  if (!stripe) {
    return {
      applePay: false,
      googlePay: false,
      paymentRequest: false,
    }
  }

  const paymentRequest = stripe.paymentRequest({
    country: 'KR',
    currency: 'krw',
    total: {
      label: 'Test',
      amount: 1000,
    },
  })

  const canMakePaymentResult = await paymentRequest.canMakePayment()

  return {
    applePay: canMakePaymentResult?.applePay || false,
    googlePay: canMakePaymentResult?.googlePay || false,
    paymentRequest: !!canMakePaymentResult,
  }
}

/**
 * Create payment request for Apple/Google Pay
 */
export async function createPaymentRequest({
  amount,
  currency = 'krw',
  label,
}: {
  amount: number
  currency?: string
  label: string
}) {
  const stripe = await getStripe()
  
  if (!stripe) {
    throw new Error('Stripe is not available')
  }

  return stripe.paymentRequest({
    country: 'KR',
    currency: currency.toLowerCase(),
    total: {
      label,
      amount,
    },
    requestPayerName: true,
    requestPayerEmail: true,
    requestPayerPhone: false,
  })
}

/**
 * Constants for payment configuration
 */
export const PAYMENT_CONFIG = {
  // Minimum and maximum amounts in KRW
  MIN_AMOUNT_KRW: 100,
  MAX_AMOUNT_KRW: 1000000000,
  
  // Default currency
  DEFAULT_CURRENCY: 'KRW',
  
  // Supported payment methods
  SUPPORTED_METHODS: ['card', 'apple_pay', 'google_pay'] as const,
  
  // Payment confirmation timeout
  CONFIRMATION_TIMEOUT: 300000, // 5 minutes
} as const

export default {
  getStripe,
  formatCurrency,
  formatPaymentMethod,
  validatePaymentAmount,
  handleStripeError,
  createPaymentMethodDisplay,
  canMakePayment,
  createPaymentRequest,
  PAYMENT_CONFIG,
}