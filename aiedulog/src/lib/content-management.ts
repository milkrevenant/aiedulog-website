/**
 * Content Management System Utilities
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Helper functions for working with the content management system
 */

import { createRDSClient } from '@/lib/db/rds-client';
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
function getClient() {
  return createRDSClient();
}

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
      const rds = getClient();
      const limit = options.limit ?? 10;
      const offset = options.offset ?? 0;

      let dataQuery = rds
        .from('main_content_sections')
        .select('*')
        .order('sort_order', { ascending: true });

      if (options.status) {
        dataQuery = dataQuery.eq('status', options.status);
      }

      if (options.visibility) {
        dataQuery = dataQuery.eq('visibility', options.visibility);
      }

      if (options.limit !== undefined || options.offset !== undefined) {
        dataQuery = dataQuery.range(offset, offset + limit - 1);
      }

      const { data: sectionRows, error } = await dataQuery;

      if (error) throw error;

      const sections = (sectionRows ?? []) as MainContentSection[];

      let countQuery = rds.from('main_content_sections');

      if (options.status) {
        countQuery = countQuery.eq('status', options.status);
      }

      if (options.visibility) {
        countQuery = countQuery.eq('visibility', options.visibility);
      }

      const countResponse = await countQuery.count({ count: 'exact' });

      if (countResponse.error) {
        throw countResponse.error;
      }

      const total = countResponse.count || 0;

      return {
        success: true,
        data: {
          data: sections,
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          has_next: total > offset + sections.length,
          has_previous: offset > 0,
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
      const rds = getClient();
      const { data, error } = await rds
        .from('main_content_sections')
        .select('*')
        .eq('id', id);

      if (error) throw error;

      const rows = (data ?? []) as MainContentSection[];
      const section = rows[0];

      if (!section) {
        return {
          success: false,
          error: 'Content section not found',
        };
      }

      return {
        success: true,
        data: section,
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
      const rds = getClient();
      const { data, error } = await rds
        .from('main_content_sections')
        .select('*')
        .eq('section_key', sectionKey);

      if (error) throw error;

      const rows = (data ?? []) as MainContentSection[];
      const section = rows[0];

      if (!section) {
        return {
          success: false,
          error: 'Content section not found',
        };
      }

      return {
        success: true,
        data: section,
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
      const rds = getClient();
      const { data, error } = await rds.from('main_content_sections').insert(sectionData);

      if (error) throw error;

      const rows = (data ?? []) as MainContentSection[];
      const section = rows[0];

      if (!section) {
        throw new Error('Content section creation returned no data');
      }

      return {
        success: true,
        data: section,
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
      const rds = getClient();
      const { data, error } = await rds
        .from('main_content_sections')
        .eq('id', id)
        .update(updateData);

      if (error) throw error;

      const rows = (data ?? []) as MainContentSection[];
      const section = rows[0];

      if (!section) {
        throw new Error('Content section update returned no data');
      }

      return {
        success: true,
        data: section,
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
      const rds = getClient();
      const { error } = await rds
        .from('main_content_sections')
        .eq('id', id)
        .delete();

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
      const rds = getClient();
      const { data, error } = await rds
        .from('main_content_sections')
        .eq('id', id)
        .update({ 
          status: 'published' as ContentStatus, 
          published_at: new Date().toISOString() 
        });

      if (error) throw error;

      const rows = (data ?? []) as MainContentSection[];
      const section = rows[0];

      if (!section) {
        throw new Error('Content section publish returned no data');
      }

      return {
        success: true,
        data: section,
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
      const rds = getClient();
      const { data, error } = await rds
        .from('content_blocks')
        .select('*')
        .eq('section_id', sectionId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: (data ?? []) as ContentBlock[],
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
      const rds = getClient();
      const { data, error } = await rds
        .from('content_blocks')
        .insert(blockData);

      if (error) throw error;

      const rows = (data ?? []) as ContentBlock[];
      const block = rows[0];

      if (!block) {
        throw new Error('Content block creation returned no data');
      }

      return {
        success: true,
        data: block,
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
      const rds = getClient();
      const { data, error } = await rds
        .from('content_blocks')
        .eq('id', id)
        .update(updateData);

      if (error) throw error;

      const rows = (data ?? []) as ContentBlock[];
      const block = rows[0];

      if (!block) {
        throw new Error('Content block update returned no data');
      }

      return {
        success: true,
        data: block,
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
      const rds = getClient();
      const { error } = await rds
        .from('content_blocks')
        .eq('id', id)
        .delete();

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

      const rds = getClient();
      const { error } = await rds
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
      const rds = getClient();
      const { data, error } = await rds
        .rpc('get_content_hierarchy', {
          p_section_key: sectionKey || null,
          p_language: language,
        });

      if (error) throw error;

      return {
        success: true,
        data: (data ?? []) as ContentHierarchy[],
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
      const rds = getClient();

      let sectionsQuery = rds
        .from('main_content_sections')
        .select('*')
        .order('sort_order');

      if (sectionKey) {
        sectionsQuery = sectionsQuery.eq('section_key', sectionKey);
      }

      const { data: sectionRows, error: sectionsError } = await sectionsQuery;
      if (sectionsError) throw sectionsError;

      const sections = (sectionRows ?? []) as MainContentSection[];

      // Get blocks for all sections
      const sectionIds = sections.map((s) => s.id);
      const { data: blockRows, error: blocksError } = await rds
        .from('content_blocks')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_order');

      if (blocksError) throw blocksError;

      const blocks = (blockRows ?? []) as ContentBlock[];

      // Combine sections with their blocks
      const hierarchy: ContentHierarchy[] = sections.map((section) => ({
        id: section.id,
        section_key: section.section_key,
        title: section.title.ko || section.title.en || '',
        slug: section.slug.ko || section.slug.en || '',
        description: section.description?.ko || section.description?.en,
        blocks: blocks.filter((block) => block.section_id === section.id),
      }));

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
      const rds = getClient();
      const { data, error } = await rds
        .from('main_content_versions')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: (data ?? []) as ContentVersion[],
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
      const rds = getClient();
      const { data, error } = await rds
        .rpc('create_content_version', {
          p_content_type: contentType,
          p_content_id: contentId,
          p_content_data: contentData,
          p_change_summary: changeSummary,
          p_is_major: isMajor,
        });

      if (error) throw error;

      const rows = (data ?? []) as ContentVersion[];
      const version = rows[0];

      if (!version) {
        throw new Error('Content version creation returned no data');
      }

      return {
        success: true,
        data: version,
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
      const rds = getClient();
      const { error } = await rds
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

      const rds = getClient();
      const { error } = await rds
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
      const rds = getClient();
      let baseQuery = rds
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

      const rows = (data ?? []) as ContentAnalytics[];

      // Process data to create analytics result
      const analytics: AnalyticsResult = {
        total_events: rows.length,
        unique_users: new Set(
          rows.map((record) => record.user_id).filter(Boolean)
        ).size,
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
      const rds = getClient();
      let query = rds
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
        data: (data ?? []) as ContentTemplate[],
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
      const rds = getClient();
      // First, get the template
      const { data: templateRows, error: templateError } = await rds
        .from('content_templates')
        .select('*')
        .eq('id', templateId);

      if (templateError) throw templateError;

      const templates = (templateRows ?? []) as ContentTemplate[];
      const template = templates[0];

      if (!template) {
        throw new Error('Template not found');
      }

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

      const { data: blockRows, error: blockError } = await rds
        .from('content_blocks')
        .insert(blockData);

      if (blockError) throw blockError;

      const blocks = (blockRows ?? []) as ContentBlock[];
      const block = blocks[0];

      if (!block) {
        throw new Error('Content block creation from template returned no data');
      }

      // Increment template usage count
      await rds
        .from('content_templates')
        .eq('id', templateId)
        .update({ usage_count: (template.usage_count || 0) + 1 });

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
