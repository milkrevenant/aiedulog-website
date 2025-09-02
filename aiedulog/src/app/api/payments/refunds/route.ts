/**
 * Refunds API
 * Handles refund requests and processing for payments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createRefund, handleStripeError } from '@/lib/stripe'

// Request validation schemas
const createRefundSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  description: z.string().max(500, 'Description too long').optional(),
})

const listRefundsSchema = z.object({
  paymentId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'canceled']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// GET - List refunds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      paymentId: searchParams.get('paymentId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }
    
    const validatedParams = listRefundsSchema.parse(params)

    // Initialize Supabase client
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from('refunds')
      .select(`
        *,
        payments (
          id,
          amount,
          currency,
          description,
          user_id,
          appointments (
            id,
            title,
            appointment_date,
            start_time
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1)

    // Filter by payment ID if specified
    if (validatedParams.paymentId) {
      query = query.eq('payment_id', validatedParams.paymentId)
    }

    // Filter by status if specified
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }

    // Execute query
    const { data: refunds, error: refundsError } = await query

    if (refundsError) {
      console.error('Error fetching refunds:', refundsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refunds' },
        { status: 500 }
      )
    }

    // Filter results to only include user's own refunds (or admin access)
    const { data: userRole } = await supabase
      .from('identities')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userRole?.role && ['admin', 'super_admin'].includes(userRole.role)
    
    const filteredRefunds = (refunds || []).filter(refund => 
      isAdmin || refund.payments?.user_id === user.id
    )

    // Format response
    const formattedRefunds = filteredRefunds.map(refund => ({
      id: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
      stripeRefundId: refund.stripe_refund_id,
      processedAt: refund.processed_at,
      failedAt: refund.failed_at,
      failureMessage: refund.failure_message,
      createdAt: refund.created_at,
      requestedBy: refund.requested_by,
      payment: refund.payments ? {
        id: refund.payments.id,
        originalAmount: refund.payments.amount,
        currency: refund.payments.currency,
        description: refund.payments.description,
        appointment: refund.payments.appointments ? {
          id: refund.payments.appointments.id,
          title: refund.payments.appointments.title,
          date: refund.payments.appointments.appointment_date,
          time: refund.payments.appointments.start_time,
        } : null,
      } : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        refunds: formattedRefunds,
        pagination: {
          offset: validatedParams.offset,
          limit: validatedParams.limit,
          total: formattedRefunds.length,
        },
      },
    })

  } catch (error) {
    console.error('List refunds error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request parameters',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create refund
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, amount, reason, description } = createRefundSchema.parse(body)

    // Initialize Supabase client
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          appointment_date,
          start_time,
          status,
          user_id
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check permissions - user can refund their own payments, or admin can refund any
    const { data: userRole } = await supabase
      .from('identities')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userRole?.role && ['admin', 'super_admin', 'moderator'].includes(userRole.role)
    const canRefund = isAdmin || payment.user_id === user.id

    if (!canRefund) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'Payment must be successful to refund' },
        { status: 400 }
      )
    }

    // Check if already fully refunded
    const maxRefundAmount = payment.amount - (payment.refunded_amount || 0)
    if (maxRefundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment has already been fully refunded' },
        { status: 400 }
      )
    }

    // Validate refund amount
    let refundAmount = amount || maxRefundAmount
    if (refundAmount > maxRefundAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Refund amount cannot exceed ${maxRefundAmount / 100} ${payment.currency.toUpperCase()}` 
        },
        { status: 400 }
      )
    }

    // Check appointment cancellation policy if applicable
    if (payment.appointments) {
      const appointmentDate = new Date(payment.appointments.appointment_date)
      const now = new Date()
      const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      // If appointment is less than 24 hours away, apply cancellation fee
      let finalRefundAmount = refundAmount
      if (hoursUntilAppointment < 24 && hoursUntilAppointment > 0) {
        // Apply 50% cancellation fee for last-minute cancellations
        finalRefundAmount = Math.round(refundAmount * 0.5)
      }

      // If appointment has already passed, no refund unless admin
      if (hoursUntilAppointment < 0 && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Cannot refund payment for past appointments' },
          { status: 400 }
        )
      }

      refundAmount = finalRefundAmount
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json(
        { success: false, error: 'Payment not processed through Stripe' },
        { status: 400 }
      )
    }

    // Create refund in database first
    const { data: refundRecord, error: refundDbError } = await supabase
      .rpc('process_appointment_refund', {
        p_payment_id: paymentId,
        p_refund_amount: refundAmount,
        p_reason: description || reason || 'Customer requested refund',
        p_requested_by: user.id
      })

    if (refundDbError) {
      console.error('Database refund creation error:', refundDbError)
      return NextResponse.json(
        { success: false, error: 'Failed to create refund record' },
        { status: 500 }
      )
    }

    // Process refund through Stripe
    try {
      const stripeRefund = await createRefund({
        paymentIntentId: payment.stripe_payment_intent_id,
        amount: refundAmount,
        reason,
        metadata: {
          refund_id: refundRecord,
          user_id: user.id,
          appointment_id: payment.appointments?.id || '',
          description: description || '',
        },
      })

      // Update refund record with Stripe details
      await supabase
        .from('refunds')
        .update({
          stripe_refund_id: stripeRefund.id,
          status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'processing',
          processed_at: stripeRefund.status === 'succeeded' ? new Date().toISOString() : null,
          metadata: {
            stripe_refund: stripeRefund,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', refundRecord)

      // Update payment refunded amount
      await supabase
        .from('payments')
        .update({
          refunded_amount: (payment.refunded_amount || 0) + refundAmount,
          status: (payment.refunded_amount || 0) + refundAmount >= payment.amount ? 'refunded' : 'partially_refunded',
        })
        .eq('id', paymentId)

      // Cancel appointment if fully refunded
      if (payment.appointments && (payment.refunded_amount || 0) + refundAmount >= payment.amount) {
        await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Payment refunded',
          })
          .eq('id', payment.appointments.id)
      }

      return NextResponse.json({
        success: true,
        data: {
          refund: {
            id: refundRecord,
            stripeRefundId: stripeRefund.id,
            amount: refundAmount,
            currency: payment.currency,
            status: stripeRefund.status,
            reason: description || reason,
            expectedArrival: stripeRefund.status === 'succeeded' ? 'immediate' : '3-5 business days',
          },
          payment: {
            id: payment.id,
            originalAmount: payment.amount,
            refundedAmount: (payment.refunded_amount || 0) + refundAmount,
            remainingAmount: payment.amount - ((payment.refunded_amount || 0) + refundAmount),
          },
          message: 'Refund processed successfully',
        },
      })

    } catch (stripeError) {
      // Update refund status to failed in database
      await supabase
        .from('refunds')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_message: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
        })
        .eq('id', refundRecord)

      throw stripeError
    }

  } catch (error) {
    console.error('Create refund error:', error)

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = handleStripeError(error)
      return NextResponse.json(
        { 
          success: false, 
          error: stripeError.message,
          code: stripeError.code,
          type: stripeError.type 
        },
        { status: 400 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}