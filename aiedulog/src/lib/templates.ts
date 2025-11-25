/**
 * Enterprise Template System
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Advanced template management and processing utilities
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentTemplate, ContentBlock, MainContentSection, ContentBlockType } from '@/types/content-management';

const supabase = createClient();

// ============================================================================
// TEMPLATE CATEGORIES AND CONFIGURATION
// ============================================================================

export interface TemplateCategory {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string;
  color: string;
  subcategories: TemplateSubcategory[];
}

export interface TemplateSubcategory {
  id: string;
  name: { ko: string; en: string };
  parent_category: string;
  icon: string;
  color: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'industry',
    name: { ko: '산업별 템플릿', en: 'Industry Templates' },
    description: { ko: '특정 산업에 최적화된 템플릿', en: 'Templates optimized for specific industries' },
    icon: 'Business',
    color: '#1976d2',
    subcategories: [
      {
        id: 'education',
        name: { ko: '교육', en: 'Education' },
        parent_category: 'industry',
        icon: 'School',
        color: '#2e7d32'
      },
      {
        id: 'business',
        name: { ko: '비즈니스', en: 'Business' },
        parent_category: 'industry',
        icon: 'Business',
        color: '#1976d2'
      },
      {
        id: 'technology',
        name: { ko: '기술', en: 'Technology' },
        parent_category: 'industry',
        icon: 'Computer',
        color: '#7b1fa2'
      },
      {
        id: 'healthcare',
        name: { ko: '의료', en: 'Healthcare' },
        parent_category: 'industry',
        icon: 'LocalHospital',
        color: '#c62828'
      }
    ]
  },
  {
    id: 'section',
    name: { ko: '섹션 템플릿', en: 'Section Templates' },
    description: { ko: '완성된 섹션 레이아웃', en: 'Complete section layouts' },
    icon: 'ViewModule',
    color: '#7c4dff',
    subcategories: [
      {
        id: 'hero',
        name: { ko: '히어로 섹션', en: 'Hero Sections' },
        parent_category: 'section',
        icon: 'Campaign',
        color: '#1976d2'
      },
      {
        id: 'features',
        name: { ko: '특징 섹션', en: 'Feature Sections' },
        parent_category: 'section',
        icon: 'GridOn',
        color: '#7c4dff'
      },
      {
        id: 'about',
        name: { ko: '소개 섹션', en: 'About Sections' },
        parent_category: 'section',
        icon: 'TextFields',
        color: '#546e7a'
      }
    ]
  },
  {
    id: 'block',
    name: { ko: '블록 템플릿', en: 'Block Templates' },
    description: { ko: '재사용 가능한 콘텐츠 블록', en: 'Reusable content blocks' },
    icon: 'GridOn',
    color: '#00c853',
    subcategories: [
      {
        id: 'hero_blocks',
        name: { ko: '히어로 블록', en: 'Hero Blocks' },
        parent_category: 'block',
        icon: 'Campaign',
        color: '#1976d2'
      },
      {
        id: 'stats_blocks',
        name: { ko: '통계 블록', en: 'Statistics Blocks' },
        parent_category: 'block',
        icon: 'BarChart',
        color: '#00c853'
      },
      {
        id: 'timeline_blocks',
        name: { ko: '타임라인 블록', en: 'Timeline Blocks' },
        parent_category: 'block',
        icon: 'Timeline',
        color: '#ff6f00'
      }
    ]
  },
  {
    id: 'page',
    name: { ko: '페이지 템플릿', en: 'Page Templates' },
    description: { ko: '완성된 페이지 레이아웃', en: 'Complete page layouts' },
    icon: 'FileCopy',
    color: '#ff9800',
    subcategories: [
      {
        id: 'landing',
        name: { ko: '랜딩 페이지', en: 'Landing Pages' },
        parent_category: 'page',
        icon: 'Campaign',
        color: '#ff9800'
      },
      {
        id: 'portfolio',
        name: { ko: '포트폴리오', en: 'Portfolio Pages' },
        parent_category: 'page',
        icon: 'ViewModule',
        color: '#7c4dff'
      }
    ]
  }
];

// ============================================================================
// TEMPLATE ENGINE CLASS
// ============================================================================

export class TemplateEngine {
  /**
   * Get all available templates with filtering options
   */
  static async getTemplates(options: {
    category?: string;
    subcategory?: string;
    template_type?: 'section' | 'block' | 'page';
    is_featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      let query = supabase
        .from('content_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.template_type) {
        query = query.eq('template_type', options.template_type);
      }

      if (options.search) {
        query = query.or(`name->>'ko'.ilike.%${options.search}%,name->>'en'.ilike.%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get featured templates for the homepage
   */
  static async getFeaturedTemplates(limit = 6) {
    try {
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply template to create new content section or block
   */
  static async applyTemplate(templateId: string, targetData: {
    section_id?: string;
    customizations?: any;
  }) {
    try {
      // Get template data
      const { data: template, error: templateError } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Process template based on type
      let result;
      switch (template.template_type) {
        case 'section':
          result = await this.createSectionFromTemplate(template, targetData);
          break;
        case 'block':
          result = await this.createBlockFromTemplate(template, targetData);
          break;
        case 'page':
          result = await this.createPageFromTemplate(template, targetData);
          break;
        default:
          throw new Error('Unknown template type');
      }

      // Increment usage count
      await this.incrementTemplateUsage(templateId);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create section from template
   */
  private static async createSectionFromTemplate(template: ContentTemplate, targetData: any) {
    const templateData = template.template_data;
    
    // Merge template data with customizations
    const sectionData = {
      section_key: `template_${Date.now()}`,
      title: templateData.title || { ko: template.name.ko, en: template.name.en },
      slug: templateData.slug || { ko: this.generateSlug(template.name.ko), en: this.generateSlug(template.name.en) },
      description: templateData.description || template.description,
      template: template.template_key,
      status: 'draft' as const,
      sort_order: 999,
      ...targetData.customizations
    };

    // Create section
    const { data: section, error: sectionError } = await supabase
      .from('main_content_sections')
      .single()
      .insert(sectionData, { select: '*' });

    if (sectionError) throw sectionError;

    // Create blocks if template includes them
    if (templateData.blocks && Array.isArray(templateData.blocks)) {
      const blockPromises = templateData.blocks.map((blockData: any, index: number) =>
        this.createBlockFromTemplateData(section.id, blockData, index)
      );

      await Promise.all(blockPromises);
    }

    return section;
  }

  /**
   * Create block from template
   */
  private static async createBlockFromTemplate(template: ContentTemplate, targetData: any) {
    if (!targetData.section_id) {
      throw new Error('Section ID is required for block templates');
    }

    const templateData = template.template_data;
    const blockData = {
      section_id: targetData.section_id,
      block_type: templateData.type as ContentBlockType,
      content: templateData.content || {},
      metadata: templateData.metadata || {},
      layout_config: templateData.layout || {},
      animation_config: templateData.animation || {},
      sort_order: 999,
      ...targetData.customizations
    };

    const { data: block, error: blockError } = await supabase
      .from('content_blocks')
      .single()
      .insert(blockData, { select: '*' });

    if (blockError) throw blockError;

    return block;
  }

  /**
   * Create page from template (multiple sections)
   */
  private static async createPageFromTemplate(template: ContentTemplate, targetData: any) {
    const templateData = template.template_data;
    
    if (!templateData.sections || !Array.isArray(templateData.sections)) {
      throw new Error('Page template must include sections array');
    }

    const createdSections = [];

    for (const [index, sectionTemplate] of templateData.sections.entries()) {
      const sectionData = {
        section_key: `${template.template_key}_section_${index + 1}`,
        title: sectionTemplate.title || { ko: `섹션 ${index + 1}`, en: `Section ${index + 1}` },
        slug: sectionTemplate.slug || { ko: `섹션-${index + 1}`, en: `section-${index + 1}` },
        description: sectionTemplate.description,
        template: sectionTemplate.template || 'default',
        status: 'draft' as const,
        sort_order: index,
        ...targetData.customizations
      };

      const { data: section, error: sectionError } = await supabase
        .from('main_content_sections')
        .single()
        .insert(sectionData, { select: '*' });

      if (sectionError) throw sectionError;

      // Create blocks for this section
      if (sectionTemplate.blocks && Array.isArray(sectionTemplate.blocks)) {
        const blockPromises = sectionTemplate.blocks.map((blockData: any, blockIndex: number) =>
          this.createBlockFromTemplateData(section.id, blockData, blockIndex)
        );

        await Promise.all(blockPromises);
      }

      createdSections.push(section);
    }

    return createdSections;
  }

  /**
   * Helper method to create block from template data
   */
  private static async createBlockFromTemplateData(sectionId: string, blockData: any, sortOrder: number) {
    const block = {
      section_id: sectionId,
      block_type: blockData.type as ContentBlockType,
      content: blockData.content || {},
      metadata: blockData.metadata || {},
      layout_config: blockData.layout || {},
      animation_config: blockData.animation || {},
      sort_order: sortOrder,
      is_active: true,
      visibility: 'public' as const
    };

    const { error } = await supabase
      .from('content_blocks')
      .insert(block);

    if (error) throw error;
  }

  /**
   * Create custom template from existing content
   */
  static async createTemplateFromContent(data: {
    name: { ko: string; en: string };
    description?: { ko: string; en: string };
    template_type: 'section' | 'block' | 'page';
    category: string;
    source_content_id: string;
    is_public?: boolean;
  }) {
    try {
      let templateData;

      // Extract data based on content type
      if (data.template_type === 'section') {
        templateData = await this.extractSectionTemplate(data.source_content_id);
      } else if (data.template_type === 'block') {
        templateData = await this.extractBlockTemplate(data.source_content_id);
      } else {
        throw new Error('Page templates must be created manually');
      }

      // Create template record
      const template = {
        template_key: this.generateTemplateKey(data.name.en),
        name: data.name,
        description: data.description,
        template_type: data.template_type,
        category: data.category,
        template_data: templateData,
        is_public: data.is_public || false,
        usage_count: 0
      };

      const { data: newTemplate, error } = await supabase
        .from('content_templates')
        .single()
        .insert(template, { select: '*' });

      if (error) throw error;

      return {
        success: true,
        data: newTemplate
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract template data from existing section
   */
  private static async extractSectionTemplate(sectionId: string) {
    const { data: section, error: sectionError } = await supabase
      .from('main_content_sections')
      .select('*')
      .eq('id', sectionId)
      .single();

    if (sectionError) throw sectionError;

    const { data: blocks, error: blocksError } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order');

    if (blocksError) throw blocksError;

    return {
      title: section.title,
      slug: section.slug,
      description: section.description,
      template: section.template,
      settings: section.settings,
      blocks: blocks?.map((block: any) => ({
        type: block.block_type,
        content: block.content,
        metadata: block.metadata,
        layout: block.layout_config,
        animation: block.animation_config
      })) || []
    };
  }

  /**
   * Extract template data from existing block
   */
  private static async extractBlockTemplate(blockId: string) {
    const { data: block, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('id', blockId)
      .single();

    if (error) throw error;

    return {
      type: block.block_type,
      content: block.content,
      metadata: block.metadata,
      layout: block.layout_config,
      animation: block.animation_config
    };
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(templateId: string, customizations?: {
    name?: { ko: string; en: string };
    category?: string;
    is_public?: boolean;
  }) {
    try {
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      const newTemplate = {
        template_key: this.generateTemplateKey((customizations?.name?.en || originalTemplate.name.en) + '_copy'),
        name: customizations?.name || {
          ko: originalTemplate.name.ko + ' (사본)',
          en: originalTemplate.name.en + ' (Copy)'
        },
        description: originalTemplate.description,
        template_type: originalTemplate.template_type,
        category: customizations?.category || originalTemplate.category,
        template_data: originalTemplate.template_data,
        is_public: customizations?.is_public !== undefined ? customizations.is_public : false,
        usage_count: 0
      };

      const { data: duplicatedTemplate, error: createError } = await supabase
        .from('content_templates')
        .single()
        .insert(newTemplate, { select: '*' });

      if (createError) throw createError;

      return {
        success: true,
        data: duplicatedTemplate
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string) {
    try {
      const { error } = await supabase
        .from('content_templates')
        .eq('id', templateId)
        .delete();

      if (error) throw error;

      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateStats(templateId: string) {
    try {
      // This would require additional tables to track template usage
      // For now, return basic stats from the template record
      const { data: template, error } = await supabase
        .from('content_templates')
        .select('usage_count, created_at')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          usage_count: template.usage_count,
          created_at: template.created_at,
          // Additional stats would be calculated here
          recent_usage: [],
          popular_customizations: []
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Increment template usage count
   */
  private static async incrementTemplateUsage(templateId: string) {
    const { error } = await supabase
      .rpc('increment_template_usage', { template_id: templateId });

    if (error) {
      console.error('Failed to increment template usage:', error);
    }
  }

  /**
   * Generate template key from name
   */
  private static generateTemplateKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Generate slug from text
   */
  private static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

export class TemplateValidator {
  /**
   * Validate template structure
   */
  static validateTemplate(templateData: any, templateType: 'section' | 'block' | 'page'): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (templateType) {
      case 'section':
        this.validateSectionTemplate(templateData, errors, warnings);
        break;
      case 'block':
        this.validateBlockTemplate(templateData, errors, warnings);
        break;
      case 'page':
        this.validatePageTemplate(templateData, errors, warnings);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateSectionTemplate(data: any, errors: string[], warnings: string[]) {
    if (!data.title) {
      errors.push('Section template must have a title');
    }

    if (data.blocks && !Array.isArray(data.blocks)) {
      errors.push('Blocks must be an array');
    }

    if (data.blocks && data.blocks.length === 0) {
      warnings.push('Section template has no blocks');
    }
  }

  private static validateBlockTemplate(data: any, errors: string[], warnings: string[]) {
    if (!data.type) {
      errors.push('Block template must specify block type');
    }

    if (!data.content) {
      errors.push('Block template must have content');
    }

    // Validate block type specific requirements
    if (data.type === 'hero' && !data.content?.title) {
      warnings.push('Hero block should have a title');
    }
  }

  private static validatePageTemplate(data: any, errors: string[], warnings: string[]) {
    if (!data.sections || !Array.isArray(data.sections)) {
      errors.push('Page template must have sections array');
    }

    if (data.sections && data.sections.length === 0) {
      warnings.push('Page template has no sections');
    }
  }
}

// ============================================================================
// TEMPLATE PREVIEW GENERATOR
// ============================================================================

export class TemplatePreview {
  /**
   * Generate preview data for template
   */
  static generatePreviewData(template: ContentTemplate) {
    const templateData = template.template_data;

    switch (template.template_type) {
      case 'section':
        return this.generateSectionPreview(templateData);
      case 'block':
        return this.generateBlockPreview(templateData);
      case 'page':
        return this.generatePagePreview(templateData);
      default:
        return null;
    }
  }

  private static generateSectionPreview(data: any) {
    return {
      type: 'section',
      title: data.title?.ko || 'Section Title',
      description: data.description?.ko || 'Section description',
      blocks: data.blocks?.map((block: any) => ({
        type: block.type,
        content: this.generateBlockPreviewContent(block.type, block.content)
      })) || []
    };
  }

  private static generateBlockPreview(data: any) {
    return {
      type: 'block',
      blockType: data.type,
      content: this.generateBlockPreviewContent(data.type, data.content)
    };
  }

  private static generatePagePreview(data: any) {
    return {
      type: 'page',
      sections: data.sections?.map((section: any) => this.generateSectionPreview(section)) || []
    };
  }

  private static generateBlockPreviewContent(blockType: string, content: any) {
    // Generate appropriate preview content based on block type
    switch (blockType) {
      case 'hero':
        return {
          title: content?.title?.ko || 'Hero Title',
          subtitle: content?.subtitle?.ko || 'Hero Subtitle',
          description: content?.description?.ko || 'Hero description'
        };
      case 'feature_grid':
        return {
          title: content?.title?.ko || 'Features',
          items: content?.items?.slice(0, 3) || [
            { title: 'Feature 1', description: 'Feature description' }
          ]
        };
      case 'stats':
        return {
          title: content?.title?.ko || 'Statistics',
          items: content?.items?.slice(0, 4) || [
            { number: 1000, label: 'Stat Label', suffix: '+' }
          ]
        };
      default:
        return content || {};
    }
  }
}

// Export all utilities
export default {
  TemplateEngine,
  TemplateValidator,
  TemplatePreview,
  TEMPLATE_CATEGORIES
};
