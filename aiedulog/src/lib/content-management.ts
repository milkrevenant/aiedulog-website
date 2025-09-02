/**
 * Content Management System Utilities
 * Helper functions for working with the content management system
 */

import { createClient } from '@/lib/supabase/client';
import type {
  MainContentSection,
  ContentBlock,
  ContentAsset,
  ContentVersion,
  ContentTranslation,
  ContentAnalytics,
  ContentSchedule,
  ContentTemplate,
  ContentHierarchy,
  CreateContentSectionRequest,
  UpdateContentSectionRequest,
  CreateContentBlockRequest,
  ContentBlockType,
  LanguageCode,
  ContentStatus,
  ApiResponse,
  PaginatedResponse,
  AnalyticsQuery,
  AnalyticsResult,
} from '@/types/content-management';

// Initialize Supabase client
const supabase = createClient();

// ============================================================================
// CONTENT SECTION OPERATIONS
// ============================================================================

export class ContentSectionService {
  /**
   * Get all content sections with optional filtering
   */
  static async getAll(options: {
    status?: ContentStatus;
    visibility?: string;
    language?: LanguageCode;
    include_blocks?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<PaginatedResponse<MainContentSection>>> {
    try {
      let query = supabase
        .from('main_content_sections')
        .select('*', { count: 'exact' })
        .order('sort_order', { ascending: true });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.visibility) {
        query = query.eq('visibility', options.visibility);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: {
          data: data || [],
          total: count || 0,
          page: Math.floor((options.offset || 0) / (options.limit || 10)) + 1,
          limit: options.limit || 10,
          has_next: (count || 0) > (options.offset || 0) + (options.limit || 10),
          has_previous: (options.offset || 0) > 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get a single content section by ID or section_key
   */
  static async getById(id: string): Promise<ApiResponse<MainContentSection>> {
    try {
      const { data, error } = await supabase
        .from('main_content_sections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get content section by section_key
   */
  static async getBySectionKey(sectionKey: string): Promise<ApiResponse<MainContentSection>> {
    try {
      const { data, error } = await supabase
        .from('main_content_sections')
        .select('*')
        .eq('section_key', sectionKey)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new content section
   */
  static async create(sectionData: CreateContentSectionRequest): Promise<ApiResponse<MainContentSection>> {
    try {
      const { data, error } = await supabase
        .from('main_content_sections')
        .insert(sectionData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Content section created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update a content section
   */
  static async update(sectionData: UpdateContentSectionRequest): Promise<ApiResponse<MainContentSection>> {
    try {
      const { id, ...updateData } = sectionData;
      const { data, error } = await supabase
        .from('main_content_sections')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Content section updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a content section
   */
  static async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('main_content_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Content section deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish a content section
   */
  static async publish(id: string): Promise<ApiResponse<MainContentSection>> {
    try {
      const { data, error } = await supabase
        .from('main_content_sections')
        .update({ 
          status: 'published' as ContentStatus, 
          published_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Content section published successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// CONTENT BLOCK OPERATIONS
// ============================================================================

export class ContentBlockService {
  /**
   * Get all blocks for a section
   */
  static async getBySectionId(sectionId: string): Promise<ApiResponse<ContentBlock[]>> {
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('section_id', sectionId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new content block
   */
  static async create<T extends ContentBlockType>(
    blockData: CreateContentBlockRequest<T>
  ): Promise<ApiResponse<ContentBlock>> {
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .insert(blockData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Content block created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update a content block
   */
  static async update(
    id: string, 
    updateData: Partial<ContentBlock>
  ): Promise<ApiResponse<ContentBlock>> {
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Content block updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a content block
   */
  static async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('content_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Content block deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reorder content blocks
   */
  static async reorder(blockIds: string[]): Promise<ApiResponse<void>> {
    try {
      const updates = blockIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('content_blocks')
        .upsert(updates);

      if (error) throw error;

      return {
        success: true,
        message: 'Content blocks reordered successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// CONTENT HIERARCHY OPERATIONS
// ============================================================================

export class ContentHierarchyService {
  /**
   * Get full content hierarchy for public display
   */
  static async getPublicHierarchy(
    sectionKey?: string,
    language: LanguageCode = 'ko'
  ): Promise<ApiResponse<ContentHierarchy[]>> {
    try {
      // Use the database function for optimized query
      const { data, error } = await supabase
        .rpc('get_content_hierarchy', {
          p_section_key: sectionKey || null,
          p_language: language,
        });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get content hierarchy for admin (includes draft content)
   */
  static async getAdminHierarchy(
    sectionKey?: string
  ): Promise<ApiResponse<ContentHierarchy[]>> {
    try {
      // Get sections
      let sectionsQuery = supabase
        .from('main_content_sections')
        .select('*')
        .order('sort_order');

      if (sectionKey) {
        sectionsQuery = sectionsQuery.eq('section_key', sectionKey);
      }

      const { data: sections, error: sectionsError } = await sectionsQuery;
      if (sectionsError) throw sectionsError;

      // Get blocks for all sections
      const sectionIds = sections?.map(s => s.id) || [];
      const { data: blocks, error: blocksError } = await supabase
        .from('content_blocks')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_order');

      if (blocksError) throw blocksError;

      // Combine sections with their blocks
      const hierarchy = sections?.map(section => ({
        id: section.id,
        section_key: section.section_key,
        title: section.title.ko || section.title.en || '',
        slug: section.slug.ko || section.slug.en || '',
        description: section.description?.ko || section.description?.en,
        blocks: blocks?.filter(block => block.section_id === section.id) || [],
      })) || [];

      return {
        success: true,
        data: hierarchy,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// CONTENT VERSION OPERATIONS
// ============================================================================

export class ContentVersionService {
  /**
   * Get version history for content
   */
  static async getVersionHistory(
    contentType: 'section' | 'block',
    contentId: string
  ): Promise<ApiResponse<ContentVersion[]>> {
    try {
      const { data, error } = await supabase
        .from('main_content_versions')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a content version
   */
  static async createVersion(
    contentType: 'section' | 'block',
    contentId: string,
    contentData: any,
    changeSummary?: string,
    isMajor: boolean = false
  ): Promise<ApiResponse<ContentVersion>> {
    try {
      const { data, error } = await supabase
        .rpc('create_content_version', {
          p_content_type: contentType,
          p_content_id: contentId,
          p_content_data: contentData,
          p_change_summary: changeSummary,
          p_is_major: isMajor,
        });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Content version created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish a content version
   */
  static async publishVersion(versionId: string): Promise<ApiResponse<void>> {
    try {
      const { data, error } = await supabase
        .rpc('publish_content_version', {
          p_version_id: versionId,
        });

      if (error) throw error;

      return {
        success: true,
        message: 'Content version published successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// CONTENT ANALYTICS OPERATIONS
// ============================================================================

export class ContentAnalyticsService {
  /**
   * Track a content interaction
   */
  static async trackEvent(
    contentType: 'section' | 'block',
    contentId: string,
    eventType: string,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<void>> {
    try {
      const eventData: Partial<ContentAnalytics> = {
        content_type: contentType,
        content_id: contentId,
        event_type: eventType as any,
        session_id: this.getSessionId(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        device_type: this.getDeviceType(),
        interaction_data: additionalData || {},
      };

      const { error } = await supabase
        .from('content_analytics')
        .insert(eventData);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get analytics for content
   */
  static async getAnalytics(query: AnalyticsQuery): Promise<ApiResponse<AnalyticsResult>> {
    try {
      // This would typically involve multiple queries or a stored procedure
      // For now, we'll implement basic analytics
      let baseQuery = supabase
        .from('content_analytics')
        .select('*');

      if (query.content_type) {
        baseQuery = baseQuery.eq('content_type', query.content_type);
      }

      if (query.content_id) {
        baseQuery = baseQuery.eq('content_id', query.content_id);
      }

      if (query.event_type) {
        baseQuery = baseQuery.eq('event_type', query.event_type);
      }

      if (query.date_from) {
        baseQuery = baseQuery.gte('created_at', query.date_from);
      }

      if (query.date_to) {
        baseQuery = baseQuery.lte('created_at', query.date_to);
      }

      const { data, error } = await baseQuery;

      if (error) throw error;

      // Process data to create analytics result
      const analytics: AnalyticsResult = {
        total_events: data?.length || 0,
        unique_users: new Set(data?.map(d => d.user_id).filter(Boolean)).size,
        events_by_date: [],
        events_by_type: [],
        top_content: [],
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper methods for analytics
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('content_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('content_session_id', sessionId);
    }
    return sessionId;
  }

  private static getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }
}

// ============================================================================
// TEMPLATE OPERATIONS
// ============================================================================

export class ContentTemplateService {
  /**
   * Get all available templates
   */
  static async getAll(category?: string): Promise<ApiResponse<ContentTemplate[]>> {
    try {
      let query = supabase
        .from('content_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Use a template to create content
   */
  static async useTemplate(templateId: string, sectionId: string): Promise<ApiResponse<ContentBlock>> {
    try {
      // First, get the template
      const { data: template, error: templateError } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create content block from template
      const blockData = {
        section_id: sectionId,
        block_type: template.template_data.type,
        content: template.template_data.content || {},
        metadata: template.template_data.metadata || {},
        layout_config: template.template_data.layout || {},
        animation_config: template.template_data.animation || {},
        sort_order: 0,
      };

      const { data: block, error: blockError } = await supabase
        .from('content_blocks')
        .insert(blockData)
        .select()
        .single();

      if (blockError) throw blockError;

      // Increment template usage count
      await supabase
        .from('content_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);

      return {
        success: true,
        data: block,
        message: 'Template applied successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w가-힣\s-]/g, '') // Allow Korean characters
    .replace(/\s+/g, '-')
    .trim();
}

/**
 * Validate multilingual content
 */
export function validateMultilingualContent(content: any): boolean {
  return content && typeof content === 'object' && (content.ko || content.en);
}

/**
 * Get localized content based on language preference
 */
export function getLocalizedContent(content: any, language: LanguageCode = 'ko'): string {
  if (!content || typeof content !== 'object') return '';
  return content[language] || content.ko || content.en || '';
}

/**
 * Format date for display
 */
export function formatDate(date: string, language: LanguageCode = 'ko'): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const locale = language === 'ko' ? 'ko-KR' : 'en-US';
  return d.toLocaleDateString(locale, options);
}

/**
 * Debounce function for search and input handling
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Export all services
export default {
  ContentSectionService,
  ContentBlockService,
  ContentHierarchyService,
  ContentVersionService,
  ContentAnalyticsService,
  ContentTemplateService,
  generateSlug,
  validateMultilingualContent,
  getLocalizedContent,
  formatDate,
  debounce,
};