import {
withSecurity, 
  withPublicSecurity,
  withUserSecurity, 
  withAdminSecurity, 
  withHighSecurity,
  withAuthSecurity,
  withUploadSecurity,
} from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { 
  createErrorResponse, 
  handleValidationError,
  handleUnexpectedError,
  ErrorType 
} from '@/lib/security/error-handler';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNotificationService } from '@/lib/services/notification-service'
import { z } from 'zod'

// =====================================================================
// VALIDATION SCHEMAS
// =====================================================================

const preferencesUpdateSchema = z.object({
  category: z.enum(['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing']),
  channels: z.array(z.enum(['in_app', 'email', 'push', 'sms', 'webhook'])).min(1),
  quiet_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quiet_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().default('Asia/Seoul'),
  digest_frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).default('immediate'),
  max_notifications_per_hour: z.number().int().min(1).max(100).default(10),
  schedule_notifications: z.boolean().default(true),
  content_notifications: z.boolean().default(true),
  system_notifications: z.boolean().default(true),
  marketing_notifications: z.boolean().default(false),
  is_active: z.boolean().default(true)
})

const bulkPreferencesUpdateSchema = z.object({
  preferences: z.array(preferencesUpdateSchema).min(1).max(10)
})

const defaultPreferencesSchema = z.object({
  user_id: z.string().uuid()
})

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

async function validateUserAccess(supabase: any, targetUserId?: string) {
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session) {
    return { user: null, identity: null, isAdmin: false, error: 'Unauthorized' }
  }

  // Get user identity
  const { data: identity } = await supabase
    .from('identities')
    .select('id, role')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!identity) {
    return { user: session.user, identity: null, isAdmin: false, error: 'User identity not found' }
  }

  const isAdmin = identity.role === 'admin' || identity.role === 'super_admin'
  
  // If accessing another user's preferences, check admin permissions
  if (targetUserId && targetUserId !== identity.id && !isAdmin) {
    return { user: session.user, identity, isAdmin: false, error: 'Forbidden' }
  }

  return { user: session.user, identity, isAdmin, error: null }
}

async function createDefaultPreferences(supabase: any, userId: string) {
  const defaultCategories = [
    'schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing'
  ] as const

  const defaultPrefs = defaultCategories.map(category => ({
    user_id: userId,
    category,
    channels: category === 'marketing' ? ['in_app'] : ['in_app', 'email'],
    timezone: 'Asia/Seoul',
    digest_frequency: 'immediate',
    max_notifications_per_hour: 10,
    schedule_notifications: true,
    content_notifications: true,
    system_notifications: true,
    marketing_notifications: category === 'marketing' ? false : true,
    is_active: true
  }))

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(defaultPrefs, { 
      onConflict: 'user_id,category',
      ignoreDuplicates: false 
    })
    .select()

  return { data, error }
}

// =====================================================================
// API ROUTE HANDLERS
// =====================================================================

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences with comprehensive category breakdown
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('user_id')
    
    // Validate user access
    const { user, identity, isAdmin, error } = await validateUserAccess(supabase, targetUserId || undefined)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : error === 'User identity not found' ? 404 : 403 }
      )
    }

    const userId = targetUserId || identity.id

    // Get user preferences
    const { data: preferences, error: fetchError } = await supabase
      .from('notification_preferences')
      .select(`
        id,
        user_id,
        category,
        channels,
        quiet_hours_start,
        quiet_hours_end,
        timezone,
        digest_frequency,
        max_notifications_per_hour,
        schedule_notifications,
        content_notifications,
        system_notifications,
        marketing_notifications,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('category')

    if (fetchError) {
      console.error('Error fetching preferences:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    // If no preferences exist, create defaults
    if (!preferences || preferences.length === 0) {
      const { data: defaultPrefs, error: createError } = await createDefaultPreferences(supabase, userId)
      
      if (createError) {
        console.error('Error creating default preferences:', createError)
        return NextResponse.json(
          { error: 'Failed to create default preferences' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          preferences: defaultPrefs || [],
          summary: {
            total_categories: defaultPrefs?.length || 0,
            active_categories: defaultPrefs?.filter((p: any) => p.is_active).length || 0,
            enabled_channels: [...new Set(defaultPrefs?.flatMap((p: any) => p.channels) || [])],
            has_quiet_hours: false
          }
        },
        message: 'Default preferences created'
      })
    }

    // Build summary statistics
    const summary = {
      total_categories: preferences.length,
      active_categories: preferences.filter(p => p.is_active).length,
      enabled_channels: [...new Set(preferences.flatMap(p => p.channels))],
      has_quiet_hours: preferences.some(p => p.quiet_hours_start && p.quiet_hours_end),
      by_category: preferences.reduce((acc: any, pref) => {
        acc[pref.category] = {
          channels: pref.channels,
          is_active: pref.is_active,
          digest_frequency: pref.digest_frequency
        }
        return acc
      }, {}),
      digest_preferences: {
        immediate: preferences.filter(p => p.digest_frequency === 'immediate').length,
        daily: preferences.filter(p => p.digest_frequency === 'daily').length,
        weekly: preferences.filter(p => p.digest_frequency === 'weekly').length,
        never: preferences.filter(p => p.digest_frequency === 'never').length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        summary
      },
      meta: {
        user_id: userId,
        is_admin_view: isAdmin && targetUserId,
        available_channels: ['in_app', 'email', 'push', 'sms', 'webhook'],
        available_categories: ['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing']
      }
    })

  } catch (error) {
    console.error('Error in GET /api/notifications/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences (single or bulk)
 */
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient()
    
    // Validate user access
    const { user, identity, isAdmin, error } = await validateUserAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const body = await request.json()
    const targetUserId = body.user_id || identity.id

    // Admin can update any user's preferences
    if (targetUserId !== identity.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot update another user\'s preferences' },
        { status: 403 }
      )
    }

    // Determine if this is a bulk update or single preference update
    let validationResult
    let isBulkUpdate = false

    if (body.preferences && Array.isArray(body.preferences)) {
      // Bulk update
      validationResult = bulkPreferencesUpdateSchema.safeParse(body)
      isBulkUpdate = true
    } else {
      // Single preference update
      validationResult = preferencesUpdateSchema.safeParse(body)
    }

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data
    const updatedPreferences: any[] = []
    const errors: string[] = []

    if (isBulkUpdate) {
      // Handle bulk preference updates
      for (const prefData of (validatedData as any).preferences) {
        try {
          const { data, error: updateError } = await supabase
            .from('notification_preferences')
            .upsert({
              user_id: targetUserId,
              ...prefData,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,category'
            })
            .select()
            .single()

          if (updateError) {
            errors.push(`Category ${prefData.category}: ${updateError.message}`)
          } else if (data) {
            updatedPreferences.push(data)
          }
        } catch (err) {
          errors.push(`Category ${prefData.category}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    } else {
      // Handle single preference update
      try {
        const { data, error: updateError } = await supabase
          .from('notification_preferences')
          .upsert({
            user_id: targetUserId,
            ...validatedData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,category'
          })
          .select()
          .single()

        if (updateError) {
          errors.push(updateError.message)
        } else if (data) {
          updatedPreferences.push(data)
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    if (errors.length > 0 && updatedPreferences.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update preferences',
          details: errors
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_preferences: updatedPreferences,
        count: updatedPreferences.length
      },
      warnings: errors.length > 0 ? errors : undefined,
      message: `${updatedPreferences.length} preference(s) updated successfully`
    })

  } catch (error) {
    console.error('Error in PUT /api/notifications/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/preferences
 * Create default notification preferences for a user (admin only)
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient()
    
    // Validate user access (admin only)
    const { user, identity, isAdmin, error } = await validateUserAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = defaultPreferencesSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const { user_id } = validationResult.data

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('identities')
      .select('id')
      .eq('id', user_id)
      .single()

    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create default preferences
    const { data: preferences, error: createError } = await createDefaultPreferences(supabase, user_id)

    if (createError) {
      console.error('Error creating default preferences:', createError)
      return NextResponse.json(
        { error: 'Failed to create default preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          preferences: preferences || [],
          user_id,
          count: preferences?.length || 0
        },
        message: 'Default notification preferences created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in POST /api/notifications/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/preferences
 * Reset user's preferences to defaults (admin only)
 */
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient()
    
    // Validate user access
    const { user, identity, isAdmin, error } = await validateUserAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const url = new URL(request.url)
    const targetUserId = url.searchParams.get('user_id') || identity.id
    const categories = url.searchParams.get('categories')?.split(',') || []

    // Admin can reset any user's preferences
    if (targetUserId !== identity.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot reset another user\'s preferences' },
        { status: 403 }
      )
    }

    // Delete existing preferences (optionally filtered by categories)
    let deleteQuery = supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', targetUserId)

    if (categories.length > 0) {
      deleteQuery = deleteQuery.in('category', categories)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error deleting preferences:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete existing preferences' },
        { status: 500 }
      )
    }

    // Recreate default preferences
    const { data: preferences, error: createError } = await createDefaultPreferences(supabase, targetUserId)

    if (createError) {
      console.error('Error creating default preferences:', createError)
      return NextResponse.json(
        { error: 'Failed to create default preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: preferences || [],
        user_id: targetUserId,
        count: preferences?.length || 0
      },
      message: `Notification preferences reset to defaults for ${categories.length > 0 ? categories.join(', ') + ' categories' : 'all categories'}`
    })

  } catch (error) {
    console.error('Error in DELETE /api/notifications/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withPublicSecurity(getHandler);
export const PUT = withPublicSecurity(putHandler);
export const POST = withPublicSecurity(postHandler);
export const DELETE = withPublicSecurity(deleteHandler);