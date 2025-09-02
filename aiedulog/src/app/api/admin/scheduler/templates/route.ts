import {
  withAdminSecurity,
} from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/scheduler/templates
 * Get all schedule templates
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: templates, error } = await supabase
      .from('schedule_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedule templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    });
  } catch (error) {
    console.error('Error in templates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/scheduler/templates
 * Create new schedule template
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, template_config } = body;

    // Validation
    if (!name || !template_config) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, template_config' 
      }, { status: 400 });
    }

    // Get current user identity
    const { data: identity } = await supabase
      .from('identities')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    const templateData = {
      name,
      description: description || '',
      template_config,
      created_by: identity?.id
    };

    const { data: template, error } = await supabase
      .from('schedule_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error in templates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/scheduler/templates
 * Delete schedule template
 */
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('schedule_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error in templates DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const DELETE = withAdminSecurity(deleteHandler);