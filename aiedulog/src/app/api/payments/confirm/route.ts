/**
 * Confirm Payment API
 * Handles payment confirmation and status updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { confirmPaymentIntent, retrievePaymentIntent, handleStripeError } from '@/lib/stripe'

// Request validation schema
const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  paymentMethodId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { paymentIntentId, paymentMethodId } = confirmPaymentSchema.parse(body)

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

    // Get payment record from database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          appointment_date,
          start_time,
          status
        )
      `)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('user_id', user.id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found or access denied' },
        { status: 404 }
      )
    }

    let paymentIntent

    // If payment method is provided, confirm the payment intent
    if (paymentMethodId) {
      paymentIntent = await confirmPaymentIntent(paymentIntentId, paymentMethodId)
    } else {
      // Just retrieve the current status
      paymentIntent = await retrievePaymentIntent(paymentIntentId)
    }

    // Update payment status in database
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: paymentIntent.status,
        stripe_charge_id: paymentIntent.latest_charge,
        paid_at: (paymentIntent.status as any) === 'succeeded' ? new Date().toISOString() : null,
        failed_at: (paymentIntent.status as any) === 'failed' ? new Date().toISOString() : null,
        failure_code: paymentIntent.last_payment_error?.code || null,
        failure_message: paymentIntent.last_payment_error?.message || null,
        metadata: {
          ...payment.metadata,
          stripe_payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            client_secret: paymentIntent.client_secret,
            confirmation_method: paymentIntent.confirmation_method,
            payment_method: paymentIntent.payment_method,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Payment update error:', updateError)
      // Continue anyway as the payment status from Stripe is authoritative
    }

    // Update appointment status based on payment status
    if (paymentIntent.status === 'succeeded') {
      const { error: appointmentUpdateError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'succeeded',
          status: payment.appointments?.status === 'pending' ? 'confirmed' : payment.appointments?.status,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', payment.id)

      if (appointmentUpdateError) {
        console.error('Appointment update error:', appointmentUpdateError)
      }

      // Create transaction record for successful payment
      await supabase
        .from('payment_transactions')
        .insert({
          payment_id: payment.id,
          type: 'payment',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: 'Payment completed successfully',
          status: 'completed',
          external_transaction_id: paymentIntent.latest_charge,
          gateway_response: {
            stripe_payment_intent_id: paymentIntent.id,
            stripe_charge_id: paymentIntent.latest_charge,
            payment_method_id: paymentIntent.payment_method,
          },
        })

    } else if ((paymentIntent.status as any) === 'payment_failed') {
      await supabase
        .from('appointments')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', payment.id)

      // Create transaction record for failed payment
      await supabase
        .from('payment_transactions')
        .insert({
          payment_id: payment.id,
          type: 'payment',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
          status: 'failed',
          gateway_response: {
            stripe_payment_intent_id: paymentIntent.id,
            error: paymentIntent.last_payment_error,
          },
        })
    }

    // Handle different payment intent statuses
    let nextAction = null
    let requiresAction = false

    if (paymentIntent.status === 'requires_action') {
      requiresAction = true
      nextAction = paymentIntent.next_action
    }

    // Prepare response based on payment status
    const response = {
      success: true,
      data: {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        },
        payment: {
          id: payment.id,
          status: paymentIntent.status,
          amount: payment.amount,
          currency: payment.currency,
        },
        appointment: payment.appointments ? {
          id: payment.appointments.id,
          title: payment.appointments.title,
          date: payment.appointments.appointment_date,
          time: payment.appointments.start_time,
          status: paymentIntent.status === 'succeeded' ? 'confirmed' : payment.appointments.status,
        } : null,
        requiresAction,
        nextAction,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Confirm payment error:', error)

    // Handle Stripe-specific errors
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

    // Handle validation errors
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