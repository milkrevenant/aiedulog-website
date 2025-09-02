/**
 * Admin Payment Management API
 * Handles admin-level payment operations and queries
 */

import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime for Stripe operations
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Request validation schemas
const listPaymentsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded']).optional(),
  dateFilter: z.enum(['today', 'week', 'month', 'year']).optional(),
  search: z.string().optional(),
  appointmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

// GET - List all payments (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      status: searchParams.get('status') || undefined,
      dateFilter: searchParams.get('dateFilter') || undefined,
      search: searchParams.get('search') || undefined,
      appointmentId: searchParams.get('appointmentId') || undefined,
      userId: searchParams.get('userId') || undefined,
    }

    const validatedParams = listPaymentsSchema.parse(params)

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

    // Check admin permissions
    const { data: userRole, error: roleError } = await supabase
      .from('identities')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userRole?.role || !['admin', 'super_admin', 'moderator'].includes(userRole.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('payments')
      .select(`
        *,
        identities!payments_user_id_fkey (
          id,
          email,
          display_name,
          first_name,
          last_name
        ),
        appointments (
          id,
          title,
          appointment_date,
          start_time,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1)

    // Apply filters
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }

    if (validatedParams.appointmentId) {
      query = query.eq('appointment_id', validatedParams.appointmentId)
    }

    if (validatedParams.userId) {
      query = query.eq('user_id', validatedParams.userId)
    }

    if (validatedParams.dateFilter) {
      const now = new Date()
      let startDate: Date

      switch (validatedParams.dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // Execute query
    const { data: payments, error: paymentsError } = await query

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payments' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })

    // Apply same filters to count query
    if (validatedParams.status) {
      countQuery = countQuery.eq('status', validatedParams.status)
    }
    if (validatedParams.appointmentId) {
      countQuery = countQuery.eq('appointment_id', validatedParams.appointmentId)
    }
    if (validatedParams.userId) {
      countQuery = countQuery.eq('user_id', validatedParams.userId)
    }

    const { count } = await countQuery

    // Format response
    const formattedPayments = (payments || []).map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethodType: payment.payment_method_type,
      description: payment.description,
      userEmail: payment.identities?.email || 'Unknown',
      userName: payment.identities?.display_name || 
                `${payment.identities?.first_name} ${payment.identities?.last_name}`.trim() || 
                'Unknown User',
      appointmentTitle: payment.appointments?.title,
      appointmentDate: payment.appointments?.appointment_date,
      appointmentTime: payment.appointments?.start_time,
      refundedAmount: payment.refunded_amount || 0,
      stripePaymentIntentId: payment.stripe_payment_intent_id,
      stripeChargeId: payment.stripe_charge_id,
      receiptUrl: payment.receipt_url,
      createdAt: payment.created_at,
      paidAt: payment.paid_at,
      failedAt: payment.failed_at,
      canceledAt: payment.canceled_at,
      metadata: payment.metadata,
    }))

    // Apply search filter after database query (for flexibility)
    let filteredPayments = formattedPayments
    if (validatedParams.search) {
      const searchLower = validatedParams.search.toLowerCase()
      filteredPayments = formattedPayments.filter(payment =>
        payment.userEmail.toLowerCase().includes(searchLower) ||
        payment.userName.toLowerCase().includes(searchLower) ||
        payment.description.toLowerCase().includes(searchLower) ||
        payment.appointmentTitle?.toLowerCase().includes(searchLower) ||
        payment.id.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        payments: filteredPayments,
        pagination: {
          offset: validatedParams.offset,
          limit: validatedParams.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / validatedParams.limit),
        },
      },
    })

  } catch (error) {
    console.error('Admin payments list error:', error)

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

// POST - Admin payment operations (force refund, manual adjustment, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, paymentId, ...actionData } = body

    // Initialize Supabase client
    const supabase = await createClient()
    
    // Get authenticated user and check admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: userRole, error: roleError } = await supabase
      .from('identities')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userRole?.role || !['admin', 'super_admin'].includes(userRole.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'force_refund':
        // Admin can force refund without going through Stripe
        const { amount, reason } = actionData
        
        const { error: refundError } = await supabase
          .rpc('process_appointment_refund', {
            p_payment_id: paymentId,
            p_refund_amount: amount,
            p_reason: reason || 'Admin forced refund',
            p_requested_by: user.id
          })

        if (refundError) {
          return NextResponse.json(
            { success: false, error: 'Failed to process refund' },
            { status: 500 }
          )
        }

        // Create transaction record
        await supabase
          .from('payment_transactions')
          .insert({
            payment_id: paymentId,
            type: 'refund',
            amount: -amount,
            currency: 'KRW', // Default, should get from payment
            description: `Admin forced refund: ${reason || 'No reason provided'}`,
            status: 'completed',
            processed_by: user.id,
          })

        return NextResponse.json({
          success: true,
          data: { message: 'Refund processed successfully' },
        })

      case 'manual_adjustment':
        // Admin can make manual adjustments to payment amounts
        const { adjustmentAmount, adjustmentReason } = actionData

        await supabase
          .from('payment_transactions')
          .insert({
            payment_id: paymentId,
            type: 'adjustment',
            amount: adjustmentAmount,
            currency: 'KRW',
            description: `Manual adjustment: ${adjustmentReason}`,
            status: 'completed',
            processed_by: user.id,
          })

        return NextResponse.json({
          success: true,
          data: { message: 'Manual adjustment recorded successfully' },
        })

      case 'update_status':
        // Admin can manually update payment status
        const { status, statusReason } = actionData

        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status,
            metadata: {
              admin_status_change: {
                changed_by: user.id,
                changed_at: new Date().toISOString(),
                reason: statusReason,
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to update payment status' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Payment status updated successfully' },
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Admin payment operation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}