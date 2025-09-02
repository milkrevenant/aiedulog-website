/**
 * Stripe Webhooks Handler
 * Processes Stripe webhook events for payment status updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { constructWebhookEvent } from '@/lib/stripe'

// Webhook event handlers
async function handlePaymentIntentSucceeded(event: any, supabase: any) {
  const paymentIntent = event.data.object
  
  console.log('Processing payment_intent.succeeded for:', paymentIntent.id)

  // Update payment status in database
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      stripe_charge_id: paymentIntent.latest_charge,
      receipt_url: paymentIntent.receipt_url,
      metadata: {
        ...paymentIntent.metadata,
        webhook_processed_at: new Date().toISOString(),
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (paymentError) {
    console.error('Failed to update payment status:', paymentError)
    throw paymentError
  }

  // Update appointment status
  const { error: appointmentError } = await supabase
    .from('appointments')
    .update({
      payment_status: 'succeeded',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('payment_id', (await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()
    ).data?.id)

  if (appointmentError) {
    console.error('Failed to update appointment status:', appointmentError)
  }

  // Create transaction record
  await supabase
    .from('payment_transactions')
    .insert({
      payment_id: (await supabase
        .from('payments')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .single()
      ).data?.id,
      type: 'payment',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      description: 'Payment completed via webhook',
      status: 'completed',
      external_transaction_id: paymentIntent.latest_charge,
      gateway_response: {
        stripe_payment_intent_id: paymentIntent.id,
        webhook_event_id: event.id,
      },
    })

  console.log('Successfully processed payment_intent.succeeded')
}

async function handlePaymentIntentPaymentFailed(event: any, supabase: any) {
  const paymentIntent = event.data.object
  
  console.log('Processing payment_intent.payment_failed for:', paymentIntent.id)

  // Update payment status
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
      metadata: {
        ...paymentIntent.metadata,
        webhook_processed_at: new Date().toISOString(),
        last_payment_error: paymentIntent.last_payment_error,
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (paymentError) {
    console.error('Failed to update payment status:', paymentError)
    throw paymentError
  }

  // Update appointment status
  const { error: appointmentError } = await supabase
    .from('appointments')
    .update({
      payment_status: 'failed',
    })
    .eq('payment_id', (await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()
    ).data?.id)

  if (appointmentError) {
    console.error('Failed to update appointment status:', appointmentError)
  }

  console.log('Successfully processed payment_intent.payment_failed')
}

async function handlePaymentIntentRequiresAction(event: any, supabase: any) {
  const paymentIntent = event.data.object
  
  console.log('Processing payment_intent.requires_action for:', paymentIntent.id)

  await supabase
    .from('payments')
    .update({
      status: 'requires_action',
      metadata: {
        ...paymentIntent.metadata,
        next_action: paymentIntent.next_action,
        webhook_processed_at: new Date().toISOString(),
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
}

async function handlePaymentIntentCanceled(event: any, supabase: any) {
  const paymentIntent = event.data.object
  
  console.log('Processing payment_intent.canceled for:', paymentIntent.id)

  await supabase
    .from('payments')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      metadata: {
        ...paymentIntent.metadata,
        webhook_processed_at: new Date().toISOString(),
      },
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  // Update appointment status
  await supabase
    .from('appointments')
    .update({
      payment_status: 'canceled',
    })
    .eq('payment_id', (await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()
    ).data?.id)
}

async function handleChargeDispute(event: any, supabase: any) {
  const dispute = event.data.object
  
  console.log('Processing charge.dispute.created for charge:', dispute.charge)

  // Create chargeback transaction record
  const { data: payment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_charge_id', dispute.charge)
    .single()

  if (payment) {
    await supabase
      .from('payment_transactions')
      .insert({
        payment_id: payment.id,
        type: 'chargeback',
        amount: -dispute.amount, // Negative amount for chargeback
        currency: dispute.currency,
        description: `Chargeback: ${dispute.reason}`,
        status: 'completed',
        external_transaction_id: dispute.id,
        gateway_response: {
          dispute_id: dispute.id,
          reason: dispute.reason,
          status: dispute.status,
          webhook_event_id: event.id,
        },
      })
  }
}

async function handleRefundCreated(event: any, supabase: any) {
  const refund = event.data.object
  
  console.log('Processing charge.refund.updated for:', refund.id)

  // Find the payment
  const { data: payment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_charge_id', refund.charge)
    .single()

  if (payment) {
    // Update refund status in database
    await supabase
      .from('refunds')
      .update({
        status: refund.status === 'succeeded' ? 'succeeded' : 'failed',
        stripe_refund_id: refund.id,
        processed_at: new Date().toISOString(),
        metadata: {
          webhook_event_id: event.id,
          webhook_processed_at: new Date().toISOString(),
        },
      })
      .eq('payment_id', payment.id)
      .eq('amount', refund.amount)

    // Update payment refunded amount
    await supabase
      .from('payments')
      .update({
        refunded_amount: refund.amount,
        status: refund.amount === payment.amount ? 'refunded' : 'partially_refunded',
      })
      .eq('id', payment.id)

    // Create refund transaction
    await supabase
      .from('payment_transactions')
      .insert({
        payment_id: payment.id,
        type: 'refund',
        amount: -refund.amount,
        currency: refund.currency,
        description: `Refund processed: ${refund.reason || 'Refund request'}`,
        status: 'completed',
        external_transaction_id: refund.id,
        gateway_response: {
          stripe_refund_id: refund.id,
          reason: refund.reason,
          webhook_event_id: event.id,
        },
      })
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Construct and verify the webhook event
    const event = constructWebhookEvent(body, signature, webhookSecret)
    
    console.log('Received webhook event:', event.type, event.id)

    // Initialize Supabase client (service role for webhook processing)
    const supabase = await createClient()

    // Store webhook event in database for tracking
    await supabase
      .from('payment_webhooks')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event,
        processed: false,
      })

    // Handle different event types
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event, supabase)
          break

        case 'payment_intent.payment_failed':
          await handlePaymentIntentPaymentFailed(event, supabase)
          break

        case 'payment_intent.requires_action':
          await handlePaymentIntentRequiresAction(event, supabase)
          break

        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event, supabase)
          break

        case 'charge.dispute.created':
          await handleChargeDispute(event, supabase)
          break

        case 'charge.refund.updated':
          await handleRefundCreated(event, supabase)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      // Mark webhook as processed
      await supabase
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', event.id)

      console.log(`Successfully processed webhook: ${event.type} ${event.id}`)

    } catch (processingError) {
      console.error('Error processing webhook:', processingError)
      
      // Update webhook record with error
      await supabase
        .from('payment_webhooks')
        .update({
          processing_attempts: 1,
          last_error: processingError instanceof Error ? processingError.message : 'Unknown error',
        })
        .eq('stripe_event_id', event.id)

      // Don't return error to Stripe to avoid retries for application errors
      // Stripe will retry based on HTTP status code
      throw processingError
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}