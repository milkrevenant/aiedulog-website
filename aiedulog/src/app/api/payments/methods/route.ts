/**
 * Payment Methods API
 * Manages user payment methods (cards, wallets, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { 
  createOrRetrieveCustomer,
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
  handleStripeError,
  getPaymentMethodDisplayInfo
} from '@/lib/stripe'

// Request validation schemas
const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  setAsDefault: z.boolean().default(false),
})

const removePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
})

const setDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
})

// GET - List user's payment methods
export async function GET(request: NextRequest) {
  try {
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

    // Get user's Stripe customer ID
    let stripeCustomerId: string | null = null

    const { data: existingPaymentMethods } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id, user_id')
      .eq('user_id', user.id)
      .limit(1)

    if (existingPaymentMethods && existingPaymentMethods.length > 0) {
      // Get customer ID from existing payment methods
      const { data: userData } = await supabase
        .from('identities')
        .select('email, display_name, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (userData) {
        const stripeCustomer = await createOrRetrieveCustomer({
          email: userData.email,
          name: userData.display_name || 
                `${userData.first_name} ${userData.last_name}`.trim() || 
                undefined,
          userId: user.id,
        })
        stripeCustomerId = stripeCustomer.id
      }
    }

    let stripePaymentMethods: any[] = []
    if (stripeCustomerId) {
      stripePaymentMethods = await listPaymentMethods(stripeCustomerId)
    }

    // Get payment methods from database
    const { data: dbPaymentMethods, error: dbError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Error fetching payment methods from database:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment methods' },
        { status: 500 }
      )
    }

    // Combine and format payment methods
    const paymentMethods = (dbPaymentMethods || []).map(dbMethod => {
      const stripeMethod = stripePaymentMethods.find(
        sm => sm.id === dbMethod.stripe_payment_method_id
      )

      const displayInfo = getPaymentMethodDisplayInfo(stripeMethod || {
        type: dbMethod.type,
        card: dbMethod.type === 'card' ? {
          brand: dbMethod.card_brand,
          last4: dbMethod.card_last4,
          exp_month: dbMethod.card_exp_month,
          exp_year: dbMethod.card_exp_year,
        } : undefined,
      } as any)
      
      return {
        id: dbMethod.id,
        stripeId: dbMethod.stripe_payment_method_id,
        type: dbMethod.type,
        isDefault: dbMethod.is_default,
        isActive: dbMethod.is_active,
        createdAt: dbMethod.created_at,
        lastUsedAt: dbMethod.last_used_at,
        displayInfo,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        paymentMethods,
        hasDefault: paymentMethods.some(pm => pm.isDefault),
        stripeCustomerId,
      },
    })

  } catch (error) {
    console.error('Get payment methods error:', error)

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

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentMethodId, setAsDefault } = addPaymentMethodSchema.parse(body)

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

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('identities')
      .select('email, display_name, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User data not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    const stripeCustomer = await createOrRetrieveCustomer({
      email: userData.email,
      name: userData.display_name || 
            `${userData.first_name} ${userData.last_name}`.trim() || 
            undefined,
      userId: user.id,
    })

    // Attach payment method to customer in Stripe
    const stripe = await import('@/lib/stripe').then(m => m.default)
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomer.id,
    })

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    const displayInfo = getPaymentMethodDisplayInfo(paymentMethod)

    // If setting as default, unset other default methods
    if (setAsDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    // Store payment method in database
    const { data: newPaymentMethod, error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_payment_method_id: paymentMethodId,
        type: paymentMethod.type,
        is_default: setAsDefault,
        // Card-specific fields
        ...(paymentMethod.card && {
          card_brand: paymentMethod.card.brand,
          card_last4: paymentMethod.card.last4,
          card_exp_month: paymentMethod.card.exp_month,
          card_exp_year: paymentMethod.card.exp_year,
          card_fingerprint: paymentMethod.card.fingerprint,
        }),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing payment method:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to store payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentMethod: {
          id: newPaymentMethod.id,
          stripeId: newPaymentMethod.stripe_payment_method_id,
          type: newPaymentMethod.type,
          isDefault: newPaymentMethod.is_default,
          last4: displayInfo.last4,
          brand: displayInfo.brand,
          expiryMonth: displayInfo.expiryMonth,
          expiryYear: displayInfo.expiryYear,
        },
        message: 'Payment method added successfully',
      },
    })

  } catch (error) {
    console.error('Add payment method error:', error)

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

// DELETE - Remove payment method
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentMethodId } = removePaymentMethodSchema.parse(body)

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

    // Get payment method from database
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Detach from Stripe
    if (paymentMethod.stripe_payment_method_id) {
      await detachPaymentMethod(paymentMethod.stripe_payment_method_id)
    }

    // Soft delete from database
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deactivating payment method:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove payment method' },
        { status: 500 }
      )
    }

    // If this was the default payment method, set another one as default
    if (paymentMethod.is_default) {
      const { data: otherMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', paymentMethodId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (otherMethods && otherMethods.length > 0) {
        await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', otherMethods[0].id)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Payment method removed successfully',
      },
    })

  } catch (error) {
    console.error('Remove payment method error:', error)

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

// PUT - Set default payment method
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentMethodId } = setDefaultPaymentMethodSchema.parse(body)

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

    // Verify payment method belongs to user
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Unset current default
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id)

    // Set new default
    const { error: updateError } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error setting default payment method:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to set default payment method' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Default payment method updated successfully',
      },
    })

  } catch (error) {
    console.error('Set default payment method error:', error)

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