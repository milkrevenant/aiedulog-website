/**
 * Admin Payment Statistics API
 * Provides comprehensive payment analytics and metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Request validation schema
const statsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
  currency: z.string().default('KRW'),
  includeRefunds: z.boolean().default(true),
})

// GET - Get payment statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      period: searchParams.get('period') || 'month',
      currency: searchParams.get('currency') || 'KRW',
      includeRefunds: searchParams.get('includeRefunds') !== 'false',
    }

    const validatedParams = statsQuerySchema.parse(params)

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

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate = now

    switch (validatedParams.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterMonth, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Get basic payment statistics
    const { data: basicStats, error: basicStatsError } = await supabase
      .from('payments')
      .select('amount, status, refunded_amount, created_at, currency, user_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('currency', validatedParams.currency.toLowerCase())

    if (basicStatsError) {
      console.error('Error fetching basic stats:', basicStatsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment statistics' },
        { status: 500 }
      )
    }

    // Calculate metrics from basic stats
    const payments = basicStats || []
    
    const totalRevenue = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalRefunds = payments
      .reduce((sum, p) => sum + (p.refunded_amount || 0), 0)

    const totalTransactions = payments.length
    const successfulPayments = payments.filter(p => p.status === 'succeeded').length
    const failedPayments = payments.filter(p => p.status === 'failed').length
    const pendingPayments = payments.filter(p => p.status === 'pending').length
    const canceledPayments = payments.filter(p => p.status === 'canceled').length

    const averageTransactionValue = successfulPayments > 0 
      ? totalRevenue / successfulPayments 
      : 0

    const successRate = totalTransactions > 0 
      ? (successfulPayments / totalTransactions) * 100 
      : 0

    // Get daily breakdown for charts
    const dailyStats = await getDailyBreakdown(supabase, startDate, endDate, validatedParams.currency)

    // Get payment method breakdown
    const { data: paymentMethodStats, error: methodStatsError } = await supabase
      .from('payments')
      .select('payment_method_type, amount, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('currency', validatedParams.currency.toLowerCase())
      .eq('status', 'succeeded')

    const paymentMethodBreakdown = (paymentMethodStats || []).reduce((acc, payment) => {
      const method = payment.payment_method_type || 'unknown'
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 }
      }
      acc[method].count += 1
      acc[method].amount += payment.amount || 0
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    // Get appointment type revenue breakdown
    const { data: appointmentRevenueStats, error: appointmentRevenueError } = await supabase
      .from('payments')
      .select(`
        amount,
        appointments (
          appointment_types (
            type_name
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('currency', validatedParams.currency.toLowerCase())
      .eq('status', 'succeeded')

    const appointmentTypeRevenue = (appointmentRevenueStats || []).reduce((acc, payment) => {
      const typeName = (payment as any).appointments?.appointment_types?.type_name || 'Unknown'
      if (!acc[typeName]) {
        acc[typeName] = { count: 0, amount: 0 }
      }
      acc[typeName].count += 1
      acc[typeName].amount += payment.amount || 0
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    // Get recent failed payments for monitoring
    const { data: recentFailures, error: failuresError } = await supabase
      .from('payments')
      .select('id, failure_code, failure_message, created_at, amount, identities(email)')
      .eq('status', 'failed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate period-over-period growth
    const previousPeriodStart = new Date(startDate)
    const periodDuration = endDate.getTime() - startDate.getTime()
    previousPeriodStart.setTime(startDate.getTime() - periodDuration)

    const { data: previousPeriodStats } = await supabase
      .from('payments')
      .select('amount, status')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())
      .eq('currency', validatedParams.currency.toLowerCase())
      .eq('status', 'succeeded')

    const previousRevenue = (previousPeriodStats || [])
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    const previousTransactionCount = (previousPeriodStats || []).length
    const transactionGrowth = previousTransactionCount > 0 
      ? ((successfulPayments - previousTransactionCount) / previousTransactionCount) * 100 
      : 0

    // Prepare response
    const response = {
      success: true,
      data: {
        // Overview metrics
        totalRevenue,
        totalTransactions,
        successfulPayments,
        failedPayments,
        pendingPayments,
        canceledPayments,
        refundAmount: totalRefunds,
        averageTransactionValue,
        successRate,
        currency: validatedParams.currency,
        period: validatedParams.period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },

        // Growth metrics
        revenueGrowth,
        transactionGrowth,
        
        // Breakdowns
        paymentMethodBreakdown,
        appointmentTypeRevenue,
        dailyStats,
        
        // Monitoring
        recentFailures: (recentFailures || []).map(failure => ({
          id: failure.id,
          failureCode: failure.failure_code,
          failureMessage: failure.failure_message,
          amount: failure.amount,
          userEmail: (failure as any).identities?.email,
          createdAt: failure.created_at,
        })),

        // Additional metrics
        averageDailyRevenue: dailyStats.length > 0 
          ? totalRevenue / dailyStats.length 
          : 0,
        
        totalCustomers: new Set(payments.map(p => p.user_id)).size,
        
        // Conversion funnel (if you have tracking for payment intents created vs completed)
        conversionRate: successRate,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Payment stats error:', error)

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

// Helper function to get daily breakdown
async function getDailyBreakdown(supabase: any, startDate: Date, endDate: Date, currency: string) {
  const dailyStats: Array<{
    date: string
    revenue: number
    transactions: number
    refunds: number
  }> = []

  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const { data: dayPayments } = await supabase
      .from('payments')
      .select('amount, status, refunded_amount')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .eq('currency', currency.toLowerCase())

    const dayRevenue = (dayPayments || [])
      .filter((p: any) => p.status === 'succeeded')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    const dayTransactions = (dayPayments || [])
      .filter((p: any) => p.status === 'succeeded').length

    const dayRefunds = (dayPayments || [])
      .reduce((sum: number, p: any) => sum + (p.refunded_amount || 0), 0)

    dailyStats.push({
      date: currentDate.toISOString().split('T')[0],
      revenue: dayRevenue,
      transactions: dayTransactions,
      refunds: dayRefunds,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dailyStats
}