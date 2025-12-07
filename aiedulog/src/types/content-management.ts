/**
 * Content Management System Types
 * Generated from database schema for type-safe development
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type ContentStatus = 'draft' | 'published' | 'archived' | 'scheduled';

export type ContentBlockType = 
  | 'hero' 
  | 'feature_grid' 
  | 'stats' 
  | 'timeline' 
  | 'text_rich'
  | 'image_gallery' 
  | 'video_embed' 
  | 'cta' 
  | 'testimonial' 
  | 'faq';

export type AssetType = 'image' | 'video' | 'document' | 'audio' | 'archive';

export type LanguageCode = 'ko' | 'en';

export type ContentVisibility = 'public' | 'members_only' | 'admin_only';

export type TranslationStatus = 'draft' | 'translated' | 'reviewed' | 'published';

export type TranslationSource = 'manual' | 'ai' | 'professional';

export type AnalyticsEventType = 'view' | 'click' | 'interaction' | 'share' | 'download';

export type ScheduleType = 'publish' | 'unpublish' | 'archive' | 'update';

export type ScheduleStatus = 'pending' | 'executed' | 'failed' | 'cancelled';

// ============================================================================
// MULTILINGUAL CONTENT TYPES
// ============================================================================

export interface MultilingualText {
  ko: string;
  en: string;
}

export interface MultilingualTextOptional {
  ko?: string;
  en?: string;
}

// ============================================================================
// MAIN CONTENT SECTION TYPES
// ============================================================================

export interface MainContentSection {
  id: string;
  section_key: string;
  title: MultilingualText;
  slug: MultilingualText;
  description?: MultilingualText;
  meta_title?: MultilingualText;
  meta_description?: MultilingualText;
  og_image_url?: string;
  status: ContentStatus;
  published_at?: string;
  scheduled_publish_at?: string;
  sort_order: number;
  is_featured: boolean;
  visibility: ContentVisibility;
  settings: Record<string, any>;
  template: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  version_number: number;
  last_published_version: number;
}

export interface CreateContentSectionRequest {
  section_key: string;
  title: MultilingualText;
  slug: MultilingualText;
  description?: MultilingualText;
  meta_title?: MultilingualText;
  meta_description?: MultilingualText;
  og_image_url?: string;
  sort_order?: number;
  is_featured?: boolean;
  visibility?: ContentVisibility;
  settings?: Record<string, any>;
  template?: string;
}

export interface UpdateContentSectionRequest extends Partial<CreateContentSectionRequest> {
  id: string;
  status?: ContentStatus;
  scheduled_publish_at?: string;
}

// ============================================================================
// CONTENT BLOCK TYPES
// ============================================================================

export interface ContentBlock {
  id: string;
  section_id: string;
  parent_block_id?: string;
  block_type: ContentBlockType;
  block_key?: string;
  content: Record<string, any>;
  metadata: Record<string, any>;
  layout_config: Record<string, any>;
  animation_config: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  visibility: ContentVisibility;
  conditions: Record<string, any>;
  ab_test_group?: string;
  click_tracking: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// ============================================================================
// SPECIFIC CONTENT BLOCK CONTENT TYPES
// ============================================================================

export interface HeroBlockContent {
  title: MultilingualText;
  subtitle?: MultilingualText;
  cta_text?: MultilingualText;
  cta_url?: string;
  background_type: 'image' | 'gradient' | 'video';
  background_url?: string;
  background_gradient?: {
    start: string;
    end: string;
    direction?: string;
  };
}

export interface FeatureGridContent {
  title?: MultilingualText;
  subtitle?: MultilingualText;
  columns: number;
  items: Array<{
    id?: string;
    title: MultilingualText;
    description: MultilingualText;
    icon?: string;
    image_url?: string;
    link_url?: string;
  }>;
}

export interface StatsContent {
  title?: MultilingualText;
  items: Array<{
    id?: string;
    number: number;
    label: MultilingualText;
    subtitle?: MultilingualText;
    suffix?: string;
    prefix?: string;
    format?: 'number' | 'percentage' | 'currency';
  }>;
}

export interface TimelineContent {
  title?: MultilingualText;
  orientation: 'vertical' | 'horizontal';
  items: Array<{
    id?: string;
    date: string;
    title: MultilingualText;
    description?: MultilingualText;
    image_url?: string;
    link_url?: string;
  }>;
}

export interface TextRichContent {
  content: MultilingualText;
  format: 'html' | 'markdown' | 'plain';
}

export interface ImageGalleryContent {
  title?: MultilingualText;
  layout: 'grid' | 'carousel' | 'masonry';
  columns?: number;
  items: Array<{
    id?: string;
    image_url: string;
    alt_text?: MultilingualText;
    caption?: MultilingualText;
    link_url?: string;
  }>;
}

export interface VideoEmbedContent {
  title?: MultilingualText;
  video_url: string;
  video_type: 'youtube' | 'vimeo' | 'direct';
  thumbnail_url?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
}

export interface CTAContent {
  title: MultilingualText;
  description?: MultilingualText;
  button_text: MultilingualText;
  button_url: string;
  button_style: 'primary' | 'secondary' | 'outlined';
  background_color?: string;
}

export interface TestimonialContent {
  title?: MultilingualText;
  items: Array<{
    id?: string;
    content: MultilingualText;
    author_name: string;
    author_title?: string;
    author_company?: string;
    author_avatar?: string;
    rating?: number;
  }>;
}

export interface FAQContent {
  title?: MultilingualText;
  items: Array<{
    id?: string;
    question: MultilingualText;
    answer: MultilingualText;
    category?: string;
  }>;
}

// ============================================================================
// CONTENT ASSET TYPES
// ============================================================================

export interface ContentAsset {
  id: string;
  block_id?: string;
  section_id?: string;
  asset_type: AssetType;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  alt_text?: MultilingualText;
  caption?: MultilingualText;
  metadata: Record<string, any>;
  optimization_settings: Record<string, any>;
  usage_context?: string[];
  is_optimized: boolean;
  is_public: boolean;
  cdn_url?: string;
  created_at: string;
  created_by?: string;
}

export interface UploadAssetRequest {
  file: File;
  alt_text?: MultilingualText;
  caption?: MultilingualText;
  is_public?: boolean;
  optimization_settings?: Record<string, any>;
}

// ============================================================================
// CONTENT VERSION TYPES
// ============================================================================

export interface ContentVersion {
  id: string;
  content_type: 'section' | 'block';
  content_id: string;
  version_number: number;
  version_name?: string;
  content_data: Record<string, any>;
  diff_data?: Record<string, any>;
  is_major_version: boolean;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  created_by?: string;
  change_summary?: string;
  change_type: 'create' | 'update' | 'delete' | 'restore' | 'publish';
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  rollback_reason?: string;
  parent_version_id?: string;
  metadata: Record<string, any>;
}

// ============================================================================
// TRANSLATION TYPES
// ============================================================================

export interface ContentTranslation {
  id: string;
  content_type: 'section' | 'block' | 'asset';
  content_id: string;
  language: LanguageCode;
  field_name: string;
  translated_content: Record<string, any>;
  status: TranslationStatus;
  translation_source: TranslationSource;
  translator_id?: string;
  reviewer_id?: string;
  translation_quality_score?: number;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  published_at?: string;
  notes?: string;
  metadata: Record<string, any>;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ContentAnalytics {
  id: string;
  content_type: 'section' | 'block';
  content_id: string;
  event_type: AnalyticsEventType;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  device_type?: string;
  location_data?: Record<string, any>;
  interaction_data?: Record<string, any>;
  created_at: string;
  created_date: string;
}

export interface AnalyticsQuery {
  content_type?: 'section' | 'block';
  content_id?: string;
  event_type?: AnalyticsEventType;
  date_from?: string;
  date_to?: string;
  group_by?: 'day' | 'week' | 'month';
  limit?: number;
  offset?: number;
}

export interface AnalyticsResult {
  total_events: number;
  unique_users: number;
  events_by_date: Array<{
    date: string;
    count: number;
  }>;
  events_by_type: Array<{
    event_type: AnalyticsEventType;
    count: number;
  }>;
  top_content: Array<{
    content_id: string;
    content_type: 'section' | 'block';
    event_count: number;
  }>;
}

// ============================================================================
// SCHEDULING TYPES
// ============================================================================

export interface ContentSchedule {
  id: string;
  content_type: 'section' | 'block';
  content_id: string;
  schedule_type: ScheduleType;
  scheduled_time: string;
  timezone: string;
  recurrence_rule?: string;
  action_data?: Record<string, any>;
  status: ScheduleStatus;
  executed_at?: string;
  execution_result?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  created_by?: string;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface ContentTemplate {
  id: string;
  template_key: string;
  name: MultilingualText;
  description?: MultilingualText;
  template_type: 'section' | 'block' | 'page';
  category?: string;
  template_data: Record<string, any>;
  preview_image_url?: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_previous: boolean;
}

// ============================================================================
// CONTENT HIERARCHY TYPES
// ============================================================================

export interface ContentHierarchy {
  id: string;
  section_key: string;
  title: string;
  slug: string;
  description?: string;
  blocks: Array<{
    id: string;
    block_type: ContentBlockType;
    content: Record<string, any>;
    metadata: Record<string, any>;
    sort_order: number;
  }>;
}

// ============================================================================
// FORM TYPES FOR ADMIN INTERFACE
// ============================================================================

export interface ContentBlockFormData {
  block_type: ContentBlockType;
  content: any; // This will be typed based on block_type
  metadata?: Record<string, any>;
  layout_config?: Record<string, any>;
  animation_config?: Record<string, any>;
  sort_order?: number;
  is_active?: boolean;
  visibility?: ContentVisibility;
  block_key?: string;
}

export interface ContentSectionFormData {
  section_key: string;
  title: MultilingualText;
  slug: MultilingualText;
  description?: MultilingualText;
  meta_title?: MultilingualText;
  meta_description?: MultilingualText;
  og_image_url?: string;
  visibility?: ContentVisibility;
  is_featured?: boolean;
  sort_order?: number;
  template?: string;
  settings?: Record<string, any>;
}

// ============================================================================
// ANIMATION CONFIG TYPES
// ============================================================================

export interface AnimationConfig {
  entrance?: {
    type: 'fadeIn' | 'slideUp' | 'scaleIn' | 'rotateIn';
    duration: number;
    delay?: number;
    easing?: 'ease' | 'spring' | 'bounce';
  };
  hover?: {
    type: 'lift' | 'glow' | 'scale' | 'rotate';
    intensity?: number;
  };
  scroll?: {
    type: 'parallax' | 'reveal' | 'counter' | 'morph';
    trigger_offset?: number;
    stagger?: number;
  };
}

export interface LayoutConfig {
  container_width?: 'full' | 'wide' | 'narrow';
  padding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  margin?: {
    top: number;
    bottom: number;
  };
  background?: {
    type: 'none' | 'color' | 'gradient' | 'image';
    value?: string;
  };
  responsive?: {
    mobile?: Record<string, any>;
    tablet?: Record<string, any>;
    desktop?: Record<string, any>;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ContentBlockWithContent<T extends ContentBlockType> = 
  T extends 'hero' ? ContentBlock & { content: HeroBlockContent } :
  T extends 'feature_grid' ? ContentBlock & { content: FeatureGridContent } :
  T extends 'stats' ? ContentBlock & { content: StatsContent } :
  T extends 'timeline' ? ContentBlock & { content: TimelineContent } :
  T extends 'text_rich' ? ContentBlock & { content: TextRichContent } :
  T extends 'image_gallery' ? ContentBlock & { content: ImageGalleryContent } :
  T extends 'video_embed' ? ContentBlock & { content: VideoEmbedContent } :
  T extends 'cta' ? ContentBlock & { content: CTAContent } :
  T extends 'testimonial' ? ContentBlock & { content: TestimonialContent } :
  T extends 'faq' ? ContentBlock & { content: FAQContent } :
  ContentBlock;

export type CreateContentBlockRequest<T extends ContentBlockType> = {
  section_id: string;
  block_type: T;
  parent_block_id?: string;
  block_key?: string;
  sort_order?: number;
  visibility?: ContentVisibility;
  click_tracking?: boolean;
  metadata?: Record<string, any>;
  layout_config?: LayoutConfig;
  animation_config?: AnimationConfig;
} & (
  T extends 'hero' ? { content: HeroBlockContent } :
  T extends 'feature_grid' ? { content: FeatureGridContent } :
  T extends 'stats' ? { content: StatsContent } :
  T extends 'timeline' ? { content: TimelineContent } :
  T extends 'text_rich' ? { content: TextRichContent } :
  T extends 'image_gallery' ? { content: ImageGalleryContent } :
  T extends 'video_embed' ? { content: VideoEmbedContent } :
  T extends 'cta' ? { content: CTAContent } :
  T extends 'testimonial' ? { content: TestimonialContent } :
  T extends 'faq' ? { content: FAQContent } :
  { content: Record<string, any> }
);

// Export all types for easy importing
export default {
  // Main exports are already individual exports above
};