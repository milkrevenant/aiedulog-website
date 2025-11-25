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
import { createRDSClient } from '@/lib/db/rds-client';
import { requireAdmin } from '@/lib/auth/rds-auth-helpers';
import { TemplateEngine, TemplatePreview } from '@/lib/templates';
import { TableRow } from '@/lib/db/types';

type ContentTemplateRow = TableRow<'content_templates'>;

/**
 * POST /api/admin/templates/apply
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Apply template to create content
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rds = createRDSClient();

    const body = await request.json();
    const { template_id, target_data, preview_only = false } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // If preview_only, generate preview data
    if (preview_only) {
      const { data: templateRows, error: templateError } = await rds
        .from('content_templates')
        .select('*')
        .eq('id', template_id);

      const template = templateRows?.[0];

      if (templateError || !template) {
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
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rds = createRDSClient();

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('template_id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Get template data
    const { data: templateRows, error: templateError } = await rds
      .from('content_templates')
      .select('*')
      .eq('id', templateId);

    const template = templateRows?.[0];

    if (templateError || !template) {
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
