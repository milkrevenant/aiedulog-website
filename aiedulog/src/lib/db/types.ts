/**
 * Database Types
 * Type definitions for RDS PostgreSQL tables
 *
 * This file provides TypeScript types for all database tables.
 * It allows type-safe database queries and matches the Supabase pattern.
 */

/**
 * Generic table row type
 * Use this when you need a flexible type for any table row
 */
export type TableRow<T extends string = string> = Record<string, any>

/**
 * User Profiles
 */
export interface UserProfile {
  id: string
  user_id: string
  email: string
  username: string
  full_name?: string
  role: 'admin' | 'moderator' | 'verified' | 'member'
  is_active: boolean
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

/**
 * Posts
 */
export interface Post {
  id: string
  author_id: string
  title?: string
  content: string
  post_type: 'text' | 'image' | 'video' | 'link' | 'poll'
  category?: string
  tags?: string[]
  is_published: boolean
  published_at?: string
  created_at: string
  updated_at: string
}

/**
 * Comments
 */
export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id?: string
  content: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/**
 * Announcements
 */
export interface Announcement {
  id: string
  title: string
  content: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_pinned: boolean
  is_published: boolean
  published_at?: string
  expires_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * News
 */
export interface News {
  id: string
  title: string
  content: string
  excerpt?: string
  category: 'news' | 'event' | 'achievement'
  featured_image_url?: string
  is_featured: boolean
  is_published: boolean
  published_at?: string
  author_id: string
  created_at: string
  updated_at: string
}

/**
 * Lectures
 */
export interface Lecture {
  id: string
  title: string
  description?: string
  lecturer_name: string
  lecturer_affiliation?: string
  lecture_date: string
  start_time?: string
  end_time?: string
  location?: string
  online_link?: string
  max_participants?: number
  current_participants: number
  registration_deadline?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

/**
 * Training Programs
 */
export interface TrainingProgram {
  id: string
  title: string
  description?: string
  training_date: string
  instructor_name: string
  instructor_bio?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  max_participants?: number
  current_participants: number
  fee: number
  location?: string
  created_at: string
  updated_at: string
}

/**
 * Regular Meetings
 */
export interface RegularMeeting {
  id: string
  title: string
  description?: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  online_link?: string
  max_participants?: number
  current_participants: number
  registration_deadline?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

/**
 * Content Sections (Main Content)
 */
export interface ContentSection {
  id: string
  section_key: string
  title: Record<string, string>
  slug: Record<string, string>
  description: Record<string, string>
  status: 'draft' | 'published' | 'archived' | 'scheduled'
  published_at?: string
  sort_order: number
  is_featured: boolean
  visibility: 'public' | 'members_only' | 'admin_only'
  settings: Record<string, any>
  template: string
  version_number: number
  last_published_version: number
  created_at: string
  updated_at: string
}

/**
 * Content Blocks
 */
export interface ContentBlock {
  id: string
  section_id: string
  parent_block_id?: string
  block_type: 'hero' | 'feature_grid' | 'stats' | 'timeline' | 'text_rich' | 'image_gallery' | 'video_embed' | 'cta' | 'testimonial' | 'faq'
  block_key?: string
  content: Record<string, any>
  metadata: Record<string, any>
  layout_config: Record<string, any>
  animation_config: Record<string, any>
  sort_order: number
  is_active: boolean
  visibility: 'public' | 'members_only' | 'admin_only'
  created_at: string
  updated_at: string
}

/**
 * Content Templates
 */
export interface ContentTemplate {
  id: string
  template_key: string
  name: Record<string, string>
  description: Record<string, string>
  template_type: 'section' | 'block' | 'page'
  category: string
  template_data: Record<string, any>
  preview_image_url?: string
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

/**
 * Footer Categories
 */
export interface FooterCategory {
  id: string
  name: Record<string, string>
  slug: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Footer Links
 */
export interface FooterLink {
  id: string
  category_id: string
  label: Record<string, string>
  url: string
  is_external: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Footer Social Links
 */
export interface FooterSocialLink {
  id: string
  platform: string
  label: string
  url: string
  icon_name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Footer Settings
 */
export interface FooterSettings {
  id: string
  setting_key: string
  setting_value: Record<string, any>
  updated_at: string
}

/**
 * Appointments
 */
export interface Appointment {
  id: string
  user_id: string
  instructor_id: string
  appointment_type: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * Database Table Names
 * Use this to ensure consistent table name references
 */
export const TABLE_NAMES = {
  USER_PROFILES: 'user_profiles',
  POSTS: 'posts',
  COMMENTS: 'comments',
  ANNOUNCEMENTS: 'announcements',
  NEWS: 'news',
  LECTURES: 'lectures',
  TRAINING_PROGRAMS: 'training_programs',
  REGULAR_MEETINGS: 'regular_meetings',
  CONTENT_SECTIONS: 'content_sections',
  CONTENT_BLOCKS: 'content_blocks',
  CONTENT_TEMPLATES: 'content_templates',
  FOOTER_CATEGORIES: 'footer_categories',
  FOOTER_LINKS: 'footer_links',
  FOOTER_SOCIAL_LINKS: 'footer_social_links',
  FOOTER_SETTINGS: 'footer_settings',
  APPOINTMENTS: 'appointments',
} as const

/**
 * Database table map for type-safe queries
 */
export interface DatabaseTables {
  user_profiles: UserProfile
  posts: Post
  comments: Comment
  announcements: Announcement
  news: News
  lectures: Lecture
  training_programs: TrainingProgram
  regular_meetings: RegularMeeting
  content_sections: ContentSection
  content_blocks: ContentBlock
  content_templates: ContentTemplate
  footer_categories: FooterCategory
  footer_links: FooterLink
  footer_social_links: FooterSocialLink
  footer_settings: FooterSettings
  appointments: Appointment
}

/**
 * Helper type to get table row type by table name
 */
export type TableRowType<T extends keyof DatabaseTables> = DatabaseTables[T]
