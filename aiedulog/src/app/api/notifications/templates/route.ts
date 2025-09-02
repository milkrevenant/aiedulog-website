import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// =====================================================================
// VALIDATION SCHEMAS
// =====================================================================

const templateCreateSchema = z.object({
  template_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Template key must contain only lowercase letters, numbers, and underscores'),
  template_name: z.string().min(1).max(200),
  template_type: z.enum(['email_html', 'email_text', 'push_notification', 'in_app_notification', 'sms_message', 'webhook_payload']),
  category: z.enum(['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing']),
  subject_template: z.string().optional(),
  content_template: z.string().min(1),
  variables: z.any().default({}),
  language: z.string().min(2).max(10).default('ko'),
  is_active: z.boolean().default(true)
})

const templateUpdateSchema = templateCreateSchema.partial().omit({ template_key: true })

const queryParamsSchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  category: z.enum(['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing']).optional(),
  template_type: z.enum(['email_html', 'email_text', 'push_notification', 'in_app_notification', 'sms_message', 'webhook_payload']).optional(),
  language: z.string().optional(),
  is_active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'template_name', 'template_key']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

const templateTestSchema = z.object({
  template_key: z.string().min(1),
  test_data: z.any().default({}),
  recipient_email: z.string().email().optional()
})

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

async function validateAdminAccess(supabase: any) {
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session) {
    return { user: null, identity: null, error: 'Unauthorized' }
  }

  // Get user identity
  const { data: identity } = await supabase
    .from('identities')
    .select('id, role')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!identity) {
    return { user: session.user, identity: null, error: 'User identity not found' }
  }

  const isAdmin = identity.role === 'admin' || identity.role === 'super_admin'
  
  if (!isAdmin) {
    return { user: session.user, identity, error: 'Admin access required' }
  }

  return { user: session.user, identity, error: null }
}

function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''))
  })
  return result
}

function validateTemplateVariables(template: string): string[] {
  const variableRegex = /{{(\w+)}}/g
  const variables: string[] = []
  let match

  while ((match = variableRegex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

// =====================================================================
// API ROUTE HANDLERS
// =====================================================================

/**
 * GET /api/notifications/templates
 * List all notification templates with filtering and pagination (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Validate admin access
    const { user, identity, error } = await validateAdminAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : error === 'User identity not found' ? 404 : 403 }
      )
    }

    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    // Validate query parameters
    const validationResult = queryParamsSchema.safeParse(searchParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // Build query with filters
    let baseQuery = supabase
      .from('notification_templates')
      .select(`
        id,
        template_key,
        template_name,
        template_type,
        category,
        subject_template,
        content_template,
        variables,
        language,
        is_active,
        created_at,
        updated_at,
        created_by
      `)

    // Apply filters
    if (params.category) {
      baseQuery = baseQuery.eq('category', params.category)
    }
    if (params.template_type) {
      baseQuery = baseQuery.eq('template_type', params.template_type)
    }
    if (params.language) {
      baseQuery = baseQuery.eq('language', params.language)
    }
    if (params.is_active !== undefined) {
      baseQuery = baseQuery.eq('is_active', params.is_active)
    }
    if (params.search) {
      baseQuery = baseQuery.or(
        `template_name.ilike.%${params.search}%,template_key.ilike.%${params.search}%,content_template.ilike.%${params.search}%`
      )
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('notification_templates')
      .select('*', { count: 'exact' as any, head: true })
    
    // Execute main query with pagination and sorting
    const offset = (params.page - 1) * params.limit
    const { data: templates, error: fetchError } = await baseQuery
      .order(params.sort_by, { ascending: params.sort_order === 'asc' })
      .range(offset, offset + params.limit - 1)

    if (fetchError) {
      console.error('Error fetching templates:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    // Get summary statistics
    const { data: allTemplates } = await supabase
      .from('notification_templates')
      .select('category, template_type, is_active, language')

    const summary = {
      total: count || 0,
      active: allTemplates?.filter(t => t.is_active).length || 0,
      inactive: allTemplates?.filter(t => !t.is_active).length || 0,
      by_category: allTemplates?.reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1
        return acc
      }, {}) || {},
      by_type: allTemplates?.reduce((acc: any, t) => {
        acc[t.template_type] = (acc[t.template_type] || 0) + 1
        return acc
      }, {}) || {},
      by_language: allTemplates?.reduce((acc: any, t) => {
        acc[t.language] = (acc[t.language] || 0) + 1
        return acc
      }, {}) || {}
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPreviousPage = params.page > 1

    return NextResponse.json({
      success: true,
      data: templates || [],
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      summary,
      meta: {
        filters: {
          category: params.category,
          template_type: params.template_type,
          language: params.language,
          is_active: params.is_active,
          search: params.search
        },
        sort: {
          by: params.sort_by,
          order: params.sort_order
        },
        available_categories: ['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing'],
        available_types: ['email_html', 'email_text', 'push_notification', 'in_app_notification', 'sms_message', 'webhook_payload']
      }
    })

  } catch (error) {
    console.error('Error in GET /api/notifications/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/templates
 * Create new notification template (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Validate admin access
    const { user, identity, error } = await validateAdminAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = templateCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid template data',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const templateData = validationResult.data

    // Check if template key already exists
    const { data: existingTemplate } = await supabase
      .from('notification_templates')
      .select('id')
      .eq('template_key', templateData.template_key)
      .single()

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template key already exists' },
        { status: 409 }
      )
    }

    // Extract variables from templates
    const contentVariables = validateTemplateVariables(templateData.content_template)
    const subjectVariables = templateData.subject_template ? 
      validateTemplateVariables(templateData.subject_template) : []
    
    const allVariables = [...new Set([...contentVariables, ...subjectVariables])]
    
    // Auto-populate variables if not provided
    if (Object.keys(templateData.variables).length === 0) {
      templateData.variables = allVariables.reduce((acc, variable) => {
        acc[variable] = 'string'
        return acc
      }, {} as Record<string, string>)
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('notification_templates')
      .insert({
        ...templateData,
        created_by: identity.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating template:', createError)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          template,
          detected_variables: allVariables
        },
        message: 'Notification template created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in POST /api/notifications/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/templates
 * Update notification template (Admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Validate admin access
    const { user, identity, error } = await validateAdminAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const url = new URL(request.url)
    const templateId = url.searchParams.get('id')
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = templateUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid template data',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Check if template exists
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Extract variables from updated templates if content changed
    if (updateData.content_template || updateData.subject_template) {
      const contentTemplate = updateData.content_template || existingTemplate.content_template
      const subjectTemplate = updateData.subject_template || existingTemplate.subject_template
      
      const contentVariables = validateTemplateVariables(contentTemplate)
      const subjectVariables = subjectTemplate ? validateTemplateVariables(subjectTemplate) : []
      
      const allVariables = [...new Set([...contentVariables, ...subjectVariables])]
      
      // Update variables if not explicitly provided
      if (!updateData.variables) {
        updateData.variables = allVariables.reduce((acc, variable) => {
          acc[variable] = existingTemplate.variables[variable] || 'string'
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Update template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('notification_templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        template: updatedTemplate
      },
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/notifications/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/templates
 * Delete notification template (Admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Validate admin access
    const { user, identity, error } = await validateAdminAccess(supabase)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const url = new URL(request.url)
    const templateId = url.searchParams.get('id')
    const templateKey = url.searchParams.get('template_key')
    
    if (!templateId && !templateKey) {
      return NextResponse.json(
        { error: 'Template ID or template key is required' },
        { status: 400 }
      )
    }

    // Check if template exists and is not being used
    let templateQuery = supabase
      .from('notification_templates')
      .select('id, template_key, template_name')
    
    if (templateId) {
      templateQuery = templateQuery.eq('id', templateId)
    } else {
      templateQuery = templateQuery.eq('template_key', templateKey)
    }

    const { data: template, error: fetchError } = await templateQuery.single()

    if (fetchError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check if template is being used in notifications
    const { count: usageCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' as any })
      .eq('metadata->>template_key', template.template_key)

    if (usageCount && usageCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete template: currently in use by notifications',
          usage_count: usageCount 
        },
        { status: 409 }
      )
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', template.id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted_template: {
          id: template.id,
          template_key: template.template_key,
          template_name: template.template_name
        }
      },
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/notifications/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}