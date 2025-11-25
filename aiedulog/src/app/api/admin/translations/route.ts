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
import { requireAdmin } from '@/lib/auth/rds-auth-helpers';
import { createRDSClient } from '@/lib/db/rds-client';
import { TableRow } from '@/lib/db/types';

type ContentTranslationRow = TableRow<'content_translations'>;
type IdentityRow = TableRow<'identities'>;

/**
 * GET /api/admin/translations
 *
 * MIGRATION: Migrated to RDS with requireAdmin() (2025-10-14)
 * Get translations for content or translation progress
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const searchParams = request.nextUrl.searchParams;
    const contentType = searchParams.get('content_type');
    const contentId = searchParams.get('content_id');
    const languageCode = searchParams.get('language_code');
    const status = searchParams.get('status');
    const action = searchParams.get('action'); // 'progress' for translation progress
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get translation progress for specific content
    if (action === 'progress' && contentType && contentId) {
      const { data: progressData, error: progressError } = await rds
        .rpc('get_translation_progress', {
          p_content_type: contentType,
          p_content_id: contentId
        });

      if (progressError) {
        console.error('Error fetching translation progress:', progressError);
        return NextResponse.json({ error: 'Failed to fetch translation progress' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        progress: progressData
      });
    }

    // Build query
    let query = rds
      .from('content_translations')
      .select(`
        *,
        translator:translator_id(email, first_name, last_name),
        reviewer:reviewer_id(email, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (contentType) {
      query = query.eq('content_type', contentType);
    }
    if (contentId) {
      query = query.eq('content_id', contentId);
    }
    if (languageCode) {
      query = query.eq('language_code', languageCode);
    }
    if (status) {
      query = query.eq('translation_status', status);
    }

    const { data: translations, error, count } = await query.limit(limit);

    if (error) {
      console.error('Error fetching translations:', error);
      return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
    }

    // Get translation statistics
    const { data: stats } = await rds
      .rpc('get_translation_stats');

    return NextResponse.json({
      success: true,
      translations: translations || [],
      total: count || 0,
      stats: stats || [],
      limit
    });
  } catch (error) {
    console.error('Error in translations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/translations
 * Create or update translation
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const body = await request.json();
    const {
      content_type,
      content_id,
      field_name,
      language_code,
      original_text,
      translated_text,
      translation_method = 'manual',
      quality_score
    } = body;

    // Validation
    if (!content_type || !content_id || !field_name || !language_code || !original_text) {
      return NextResponse.json({ 
        error: 'Missing required fields: content_type, content_id, field_name, language_code, original_text' 
      }, { status: 400 });
    }

    // Get current user identity
    const { data: identity } = await rds
      .from<IdentityRow>('identities')
      .select('id')
      .eq('auth_user_id', auth.user.id)
      .single();

    const translationData = {
      content_type,
      content_id,
      field_name,
      language_code,
      original_text,
      translated_text,
      translation_status: translated_text ? 'translated' : 'pending',
      translation_method,
      quality_score,
      translator_id: identity?.id,
      translated_at: translated_text ? new Date().toISOString() : null
    };

    // Use upsert to handle existing translations
    const { data: translationRows, error } = await rds
      .from('content_translations')
      .upsert(translationData, {
        onConflict: 'content_type,content_id,field_name,language_code',
        select: '*'
      });

    const translation = translationRows?.[0];

    if (error) {
      console.error('Error creating translation:', error);
      return NextResponse.json({ error: 'Failed to create translation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      translation,
      message: 'Translation created successfully'
    });
  } catch (error) {
    console.error('Error in translations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/translations
 * Update translation status, review, or content
 */
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Translation ID is required' }, { status: 400 });
    }

    // Get current user identity
    const { data: identityRows } = await rds
      .from('identities')
      .select('id')
      .eq('auth_user_id', auth.user.id);
    const identity = identityRows?.[0];

    // Handle different actions
    if (action) {
      switch (action) {
        case 'approve': {
          const { data: translationRows, error } = await rds
            .from('content_translations')
            .eq('id', id)
            .update({
              translation_status: 'reviewed',
              reviewer_id: identity?.id,
              reviewed_at: new Date().toISOString()
            }, { select: '*' });

          const translation = translationRows?.[0];

          if (error) {
            return NextResponse.json({ error: 'Failed to approve translation' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            translation,
            message: 'Translation approved successfully'
          });
        }

        case 'publish': {
          const { data: translationRows, error } = await rds
            .from('content_translations')
            .eq('id', id)
            .update({
              translation_status: 'published',
              reviewed_at: new Date().toISOString()
            }, { select: '*' });

          const translation = translationRows?.[0];

          if (error) {
            return NextResponse.json({ error: 'Failed to publish translation' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            translation,
            message: 'Translation published successfully'
          });
        }

        case 'reject': {
          const { data: translationRows, error } = await rds
            .from('content_translations')
            .eq('id', id)
            .update({
              translation_status: 'draft',
              reviewer_id: identity?.id,
              reviewed_at: new Date().toISOString()
            }, { select: '*' });

          const translation = translationRows?.[0];

          if (error) {
            return NextResponse.json({ error: 'Failed to reject translation' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            translation,
            message: 'Translation rejected and returned to draft'
          });
        }

        case 'ai_translate': {
          // TODO: Integrate with AI translation service (OpenAI, Google Translate, etc.)
          // For now, return placeholder
          const { data: currentRows } = await rds
            .from('content_translations')
            .select('original_text')
            .eq('id', id);

          const currentTranslation = currentRows?.[0];

          // Simulate AI translation (replace with actual service)
          const aiTranslatedText = `[AI Translated] ${currentTranslation?.original_text}`;

          const { data: translationRows, error } = await rds
            .from('content_translations')
            .eq('id', id)
            .update({
              translated_text: aiTranslatedText,
              translation_status: 'translated',
              translation_method: 'ai',
              quality_score: 0.75, // AI confidence score
              translator_id: identity?.id,
              translated_at: new Date().toISOString()
            }, { select: '*' });

          const translation = translationRows?.[0];

          if (error) {
            return NextResponse.json({ error: 'Failed to AI translate' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            translation,
            message: 'AI translation completed'
          });
        }
      }
    }

    // Regular update
    const { data: translationRows, error } = await rds
      .from('content_translations')
      .eq('id', id)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      }, { select: '*' });

    const translation = translationRows?.[0];

    if (error) {
      console.error('Error updating translation:', error);
      return NextResponse.json({ error: 'Failed to update translation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      translation,
      message: 'Translation updated successfully'
    });
  } catch (error) {
    console.error('Error in translations PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/translations
 * Delete translation
 */
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Translation ID is required' }, { status: 400 });
    }

    const { error } = await rds
      .from('content_translations')
      .eq('id', id)
      .delete();

    if (error) {
      console.error('Error deleting translation:', error);
      return NextResponse.json({ error: 'Failed to delete translation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Translation deleted successfully'
    });
  } catch (error) {
    console.error('Error in translations DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);
