import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TemplateEngine, TemplateValidator } from '@/lib/templates';

/**
 * GET /api/admin/templates
 * Get all templates with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const options = {
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      template_type: searchParams.get('template_type') as 'section' | 'block' | 'page' | undefined,
      is_featured: searchParams.get('is_featured') === 'true',
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await TemplateEngine.getTemplates(options);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      templates: result.data,
      total: result.data?.length || 0,
      limit: options.limit,
      offset: options.offset
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/templates
 * Create new template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...templateData } = body;

    switch (action) {
      case 'create_custom': {
        const result = await TemplateEngine.createTemplateFromContent(templateData);
        
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          template: result.data,
          message: 'Template created successfully'
        });
      }

      case 'duplicate': {
        const { template_id, customizations } = templateData;
        const result = await TemplateEngine.duplicateTemplate(template_id, customizations);
        
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          template: result.data,
          message: 'Template duplicated successfully'
        });
      }

      case 'validate': {
        const { template_data, template_type } = templateData;
        const validation = TemplateValidator.validateTemplate(template_data, template_type);
        
        return NextResponse.json({
          success: true,
          validation
        });
      }

      default: {
        // Create template directly
        const validation = TemplateValidator.validateTemplate(
          templateData.template_data, 
          templateData.template_type
        );

        if (!validation.isValid) {
          return NextResponse.json({ 
            error: 'Template validation failed',
            validation 
          }, { status: 400 });
        }

        const { data: template, error } = await supabase
          .from('content_templates')
          .insert({
            template_key: templateData.template_key,
            name: templateData.name,
            description: templateData.description,
            template_type: templateData.template_type,
            category: templateData.category,
            template_data: templateData.template_data,
            preview_image_url: templateData.preview_image_url,
            is_public: templateData.is_public || false,
            usage_count: 0
          })
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
      }
    }
  } catch (error) {
    console.error('Error in template POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/templates
 * Update existing template
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Validate template if template_data is being updated
    if (updateData.template_data && updateData.template_type) {
      const validation = TemplateValidator.validateTemplate(
        updateData.template_data, 
        updateData.template_type
      );

      if (!validation.isValid) {
        return NextResponse.json({ 
          error: 'Template validation failed',
          validation 
        }, { status: 400 });
      }
    }

    const { data: template, error } = await supabase
      .from('content_templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error in template PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/templates
 * Delete template
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const result = await TemplateEngine.deleteTemplate(templateId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}