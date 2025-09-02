/**
 * Stripe Configuration and Utilities
 * Server-side Stripe integration with comprehensive error handling
 */

import Stripe from 'stripe'

// Initialize Stripe with configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
  telemetry: false, // Disable telemetry for privacy
})

// Payment method types supported
export const SUPPORTED_PAYMENT_METHODS = [
  'card',
  'apple_pay',
  'google_pay',
] as const

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  'krw',
  'usd',
  'eur',
  'jpy',
] as const

// Payment status mapping
export const PAYMENT_STATUS_MAP = {
  requires_payment_method: 'pending',
  requires_confirmation: 'pending',
  requires_action: 'requires_action',
  processing: 'processing',
  requires_capture: 'processing',
  canceled: 'canceled',
  succeeded: 'succeeded',
} as const

/**
 * Create a payment intent for an appointment
 */
export async function createPaymentIntent({
  amount,
  currency = 'krw',
  customerId,
  paymentMethodId,
  appointmentId,
  userEmail,
  metadata = {},
}: {
  amount: number
  currency?: string
  customerId?: string
  paymentMethodId?: string
  appointmentId: string
  userEmail: string
  metadata?: Record<string, string>
}): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        appointment_id: appointmentId,
        user_email: userEmail,
        ...metadata,
      },
    }

    // Add customer if provided
    if (customerId) {
      paymentIntentParams.customer = customerId
    }

    // Add payment method if provided
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId
      paymentIntentParams.confirmation_method = 'manual'
      paymentIntentParams.confirm = true
    }

    return await stripe.paymentIntents.create(paymentIntentParams)
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  try {
    const confirmParams: Stripe.PaymentIntentConfirmParams = {}

    if (paymentMethodId) {
      confirmParams.payment_method = paymentMethodId
    }

    return await stripe.paymentIntents.confirm(paymentIntentId, confirmParams)
  } catch (error) {
    console.error('Error confirming payment intent:', error)
    throw new Error(`Failed to confirm payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Retrieve a payment intent
 */
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error(`Failed to retrieve payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.cancel(paymentIntentId)
  } catch (error) {
    console.error('Error canceling payment intent:', error)
    throw new Error(`Failed to cancel payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create or retrieve a Stripe customer
 */
export async function createOrRetrieveCustomer({
  email,
  name,
  userId,
}: {
  email: string
  name?: string
  userId: string
}): Promise<Stripe.Customer> {
  try {
    // First, try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    // Create new customer if not found
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        user_id: userId,
      },
    })
  } catch (error) {
    console.error('Error creating or retrieving customer:', error)
    throw new Error(`Failed to create or retrieve customer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a setup intent for saving payment methods
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  try {
    return await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    })
  } catch (error) {
    console.error('Error creating setup intent:', error)
    throw new Error(`Failed to create setup intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string,
  type: 'card' | 'us_bank_account' = 'card'
): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type,
    })
    return paymentMethods.data
  } catch (error) {
    console.error('Error listing payment methods:', error)
    throw new Error(`Failed to list payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Detach a payment method from a customer
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  try {
    return await stripe.paymentMethods.detach(paymentMethodId)
  } catch (error) {
    console.error('Error detaching payment method:', error)
    throw new Error(`Failed to detach payment method: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a refund
 */
export async function createRefund({
  paymentIntentId,
  amount,
  reason,
  metadata = {},
}: {
  paymentIntentId: string
  amount?: number
  reason?: Stripe.RefundCreateParams.Reason
  metadata?: Record<string, string>
}): Promise<Stripe.Refund> {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata,
    }

    if (amount) {
      refundParams.amount = amount
    }

    if (reason) {
      refundParams.reason = reason
    }

    return await stripe.refunds.create(refundParams)
  } catch (error) {
    console.error('Error creating refund:', error)
    throw new Error(`Failed to create refund: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (error) {
    console.error('Error constructing webhook event:', error)
    throw new Error(`Invalid webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Format amount for display (convert cents to currency)
 */
export function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  // Convert from cents/smallest unit to main currency unit
  const divisor = currency.toLowerCase() === 'krw' ? 1 : 100
  return formatter.format(amount / divisor)
}

/**
 * Convert currency amount to smallest unit (cents)
 */
export function toSmallestUnit(amount: number, currency: string): number {
  // KRW doesn't have decimal places, so no conversion needed
  if (currency.toLowerCase() === 'krw') {
    return Math.round(amount)
  }
  // Other currencies typically need conversion to cents
  return Math.round(amount * 100)
}

/**
 * Get payment method display info
 */
export function getPaymentMethodDisplayInfo(paymentMethod: Stripe.PaymentMethod): {
  type: string
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
} {
  if (paymentMethod.type === 'card' && paymentMethod.card) {
    return {
      type: 'card',
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year,
    }
  }

  return {
    type: paymentMethod.type,
  }
}

/**
 * Handle common Stripe errors
 */
export function handleStripeError(error: any): {
  code: string
  message: string
  type: string
} {
  if (error.type === 'StripeCardError') {
    return {
      code: error.code || 'card_error',
      message: error.message || 'Your card was declined.',
      type: 'card_error',
    }
  }

  if (error.type === 'StripeRateLimitError') {
    return {
      code: 'rate_limit',
      message: 'Too many requests made to the API too quickly.',
      type: 'rate_limit_error',
    }
  }

  if (error.type === 'StripeInvalidRequestError') {
    return {
      code: 'invalid_request',
      message: error.message || 'Invalid parameters were supplied to Stripe.',
      type: 'invalid_request_error',
    }
  }

  if (error.type === 'StripeAPIError') {
    return {
      code: 'api_error',
      message: 'An error occurred internally with Stripe.',
      type: 'api_error',
    }
  }

  if (error.type === 'StripeConnectionError') {
    return {
      code: 'connection_error',
      message: 'Some kind of error occurred during the HTTPS communication.',
      type: 'connection_error',
    }
  }

  if (error.type === 'StripeAuthenticationError') {
    return {
      code: 'authentication_error',
      message: 'Authentication with Stripe failed.',
      type: 'authentication_error',
    }
  }

  return {
    code: 'unknown_error',
    message: error.message || 'An unknown error occurred.',
    type: 'unknown_error',
  }
}

export default stripe