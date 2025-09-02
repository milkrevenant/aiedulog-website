/**
 * Create Payment Intent API
 * Handles payment intent creation for appointments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createPaymentIntent, createOrRetrieveCustomer, handleStripeError, toSmallestUnit } from '@/lib/stripe'

// Request validation schema
const createIntentSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  returnUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { appointmentId, paymentMethodId, savePaymentMethod, returnUrl } = createIntentSchema.parse(body)

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

    // Get appointment details with pricing
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_types (*),
        identities (
          id,
          email,
          display_name,
          first_name,
          last_name
        )
      `)
      .eq('id', appointmentId)
      .eq('user_id', user.id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found or access denied' },
        { status: 404 }
      )
    }

    // Check if appointment requires payment
    if (!appointment.appointment_types?.requires_payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not required for this appointment type' },
        { status: 400 }
      )
    }

    // Check if payment already exists and is successful
    if (appointment.payment_status === 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'Payment already completed for this appointment' },
        { status: 400 }
      )
    }

    // Calculate pricing
    const { data: pricingData, error: pricingError } = await supabase
      .rpc('calculate_appointment_pricing', {
        p_appointment_type_id: appointment.appointment_type_id,
        p_appointment_date: appointment.appointment_date,
        p_duration_minutes: appointment.duration_minutes,
        p_user_id: user.id
      })

    if (pricingError || !pricingData) {
      console.error('Pricing calculation error:', pricingError)
      return NextResponse.json(
        { success: false, error: 'Failed to calculate appointment pricing' },
        { status: 500 }
      )
    }

    const finalAmount = pricingData.final_price
    const currency = pricingData.currency?.toLowerCase() || 'krw'

    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment amount calculated' },
        { status: 400 }
      )
    }

    // Create or retrieve Stripe customer
    const stripeCustomer = await createOrRetrieveCustomer({
      email: appointment.identities.email,
      name: appointment.identities.display_name || 
            `${appointment.identities.first_name} ${appointment.identities.last_name}`.trim() || 
            undefined,
      userId: user.id,
    })

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount: toSmallestUnit(finalAmount, currency),
      currency,
      customerId: stripeCustomer.id,
      paymentMethodId,
      appointmentId,
      userEmail: appointment.identities.email,
      metadata: {
        appointment_title: appointment.title,
        appointment_date: appointment.appointment_date,
        user_id: user.id,
        pricing_breakdown: JSON.stringify(pricingData),
      },
    })

    // Create or update payment record in database
    const { data: paymentData, error: paymentDbError } = await supabase
      .rpc('create_appointment_payment', {
        p_appointment_id: appointmentId,
        p_payment_method_id: paymentMethodId,
        p_idempotency_key: paymentIntent.id
      })

    if (paymentDbError) {
      console.error('Database payment creation error:', paymentDbError)
      // Continue anyway as Stripe payment intent is created
    }

    // Update payment record with Stripe details
    if (paymentData) {
      await supabase
        .from('payments')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          stripe_customer_id: stripeCustomer.id,
          status: paymentIntent.status,
          metadata: {
            appointment_title: appointment.title,
            appointment_date: appointment.appointment_date,
            pricing_breakdown: pricingData,
            stripe_payment_intent: {
              id: paymentIntent.id,
              status: paymentIntent.status,
              client_secret: paymentIntent.client_secret,
            },
          },
        })
        .eq('id', paymentData)
    }

    // Save payment method to user if requested
    if (savePaymentMethod && paymentMethodId) {
      // This would typically be handled after successful payment
      // For now, we'll just log the intention
      console.log('Payment method save requested for user:', user.id)
    }

    // Prepare response
    const response = {
      success: true,
      data: {
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
        appointment: {
          id: appointment.id,
          title: appointment.title,
          date: appointment.appointment_date,
          time: appointment.start_time,
          duration: appointment.duration_minutes,
        },
        pricing: pricingData,
        customer: {
          id: stripeCustomer.id,
        },
        returnUrl,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Create payment intent error:', error)

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