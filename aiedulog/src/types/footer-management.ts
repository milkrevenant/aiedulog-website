// Footer Management System Types

export interface FooterCategory {
  id: string
  title_ko: string
  title_en?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  links?: FooterLink[]
}

export interface FooterLink {
  id: string
  category_id: string
  title_ko: string
  title_en?: string
  url: string
  display_order: number
  is_active: boolean
  is_external: boolean
  created_at: string
  updated_at: string
  category?: FooterCategory
}

export interface FooterSocialLink {
  id: string
  platform: string
  icon_name: string
  url: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FooterSetting {
  id: string
  setting_key: string
  setting_value_ko?: string
  setting_value_en?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Form types for creating/editing
export interface FooterCategoryFormData {
  title_ko: string
  title_en?: string
  display_order: number
  is_active: boolean
}

export interface FooterLinkFormData {
  category_id: string
  title_ko: string
  title_en?: string
  url: string
  display_order: number
  is_active: boolean
  is_external: boolean
}

export interface FooterSocialLinkFormData {
  platform: string
  icon_name: string
  url: string
  display_order: number
  is_active: boolean
}

export interface FooterSettingFormData {
  setting_key: string
  setting_value_ko?: string
  setting_value_en?: string
  is_active: boolean
}

// API response types
export interface FooterCategoriesResponse {
  data: FooterCategory[]
  error?: string
}

export interface FooterLinksResponse {
  data: FooterLink[]
  error?: string
}

export interface FooterSocialLinksResponse {
  data: FooterSocialLink[]
  error?: string
}

export interface FooterSettingsResponse {
  data: FooterSetting[]
  error?: string
}

// Complete footer data for rendering
export interface FooterData {
  categories: FooterCategory[]
  socialLinks: FooterSocialLink[]
  settings: Record<string, FooterSetting>
}

// Validation schemas types
export interface FooterValidationErrors {
  title_ko?: string[]
  title_en?: string[]
  url?: string[]
  platform?: string[]
  icon_name?: string[]
  setting_key?: string[]
  setting_value_ko?: string[]
  setting_value_en?: string[]
  display_order?: string[]
}

// Sort operation type
export interface FooterSortOperation {
  id: string
  display_order: number
}

// Social media platform options
export const SOCIAL_PLATFORMS = [
  { value: 'youtube', label: 'YouTube', icon: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter', icon: 'Twitter' },
  { value: 'facebook', label: 'Facebook', icon: 'Facebook' },
  { value: 'instagram', label: 'Instagram', icon: 'Instagram' },
  { value: 'github', label: 'GitHub', icon: 'GitHub' },
  { value: 'discord', label: 'Discord', icon: 'Chat' },
  { value: 'telegram', label: 'Telegram', icon: 'Telegram' },
] as const

export type SocialPlatform = typeof SOCIAL_PLATFORMS[number]['value']

// Footer setting keys
export const FOOTER_SETTING_KEYS = [
  'copyright',
  'company_name', 
  'contact_email',
  'contact_phone',
  'address_ko',
  'address_en'
] as const

export type FooterSettingKey = typeof FOOTER_SETTING_KEYS[number]