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
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TemplateEngine, TemplatePreview } from '@/lib/templates';

/**
 * POST /api/admin/templates/apply
 * Apply template to create content
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
    const { template_id, target_data, preview_only = false } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // If preview_only, generate preview data
    if (preview_only) {
      const { data: template, error: templateError } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const previewData = TemplatePreview.generatePreviewData(template);

      return NextResponse.json({
        success: true,
        preview: previewData,
        template
      });
    }

    // Apply template to create actual content
    const result = await TemplateEngine.applyTemplate(template_id, target_data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Template applied successfully'
    });
  } catch (error) {
    console.error('Error applying template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/templates/apply
 * Get template application preview
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('template_id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('content_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Generate preview
    const previewData = TemplatePreview.generatePreviewData(template);

    // Get template usage statistics
    const statsResult = await TemplateEngine.getTemplateStats(templateId);

    return NextResponse.json({
      success: true,
      template,
      preview: previewData,
      stats: statsResult.success ? statsResult.data : null
    });
  } catch (error) {
    console.error('Error getting template preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAdminSecurity(postHandler);
export const GET = withAdminSecurity(getHandler);