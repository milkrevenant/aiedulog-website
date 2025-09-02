import { createClient } from '@/lib/supabase/client'
import { 
  FooterCategory, 
  FooterLink, 
  FooterSocialLink, 
  FooterSetting,
  FooterCategoryFormData,
  FooterLinkFormData,
  FooterSocialLinkFormData,
  FooterSettingFormData,
  FooterData,
  FooterSortOperation
} from '@/types/footer-management'

const supabase = createClient()

// Footer Categories
export async function getFooterCategories(): Promise<FooterCategory[]> {
  const { data, error } = await supabase
    .from('footer_categories')
    .select(`
      *,
      links:footer_links(*)
    `)
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.error('Error fetching footer categories:', error)
    throw error
  }

  return data || []
}

export async function createFooterCategory(categoryData: FooterCategoryFormData): Promise<FooterCategory> {
  const { data, error } = await supabase
    .from('footer_categories')
    .insert([categoryData])
    .select()
    .single()

  if (error) {
    console.error('Error creating footer category:', error)
    throw error
  }

  return data
}

export async function updateFooterCategory(id: string, categoryData: Partial<FooterCategoryFormData>): Promise<FooterCategory> {
  const { data, error } = await supabase
    .from('footer_categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating footer category:', error)
    throw error
  }

  return data
}

export async function deleteFooterCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('footer_categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting footer category:', error)
    throw error
  }
}

export async function updateFooterCategoriesOrder(operations: FooterSortOperation[]): Promise<void> {
  const { error } = await supabase.rpc('update_footer_categories_order', {
    updates: operations
  })

  if (error) {
    console.error('Error updating footer categories order:', error)
    // Fallback to individual updates if RPC doesn't exist
    for (const op of operations) {
      await updateFooterCategory(op.id, { display_order: op.display_order })
    }
  }
}

// Footer Links
export async function getFooterLinks(categoryId?: string): Promise<FooterLink[]> {
  let query = supabase
    .from('footer_links')
    .select(`
      *,
      category:footer_categories(*)
    `)
    .eq('is_active', true)
    .order('display_order')

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching footer links:', error)
    throw error
  }

  return data || []
}

export async function createFooterLink(linkData: FooterLinkFormData): Promise<FooterLink> {
  const { data, error } = await supabase
    .from('footer_links')
    .insert([linkData])
    .select()
    .single()

  if (error) {
    console.error('Error creating footer link:', error)
    throw error
  }

  return data
}

export async function updateFooterLink(id: string, linkData: Partial<FooterLinkFormData>): Promise<FooterLink> {
  const { data, error } = await supabase
    .from('footer_links')
    .update(linkData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating footer link:', error)
    throw error
  }

  return data
}

export async function deleteFooterLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('footer_links')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting footer link:', error)
    throw error
  }
}

export async function updateFooterLinksOrder(operations: FooterSortOperation[]): Promise<void> {
  const { error } = await supabase.rpc('update_footer_links_order', {
    updates: operations
  })

  if (error) {
    console.error('Error updating footer links order:', error)
    // Fallback to individual updates if RPC doesn't exist
    for (const op of operations) {
      await updateFooterLink(op.id, { display_order: op.display_order })
    }
  }
}

// Footer Social Links
export async function getFooterSocialLinks(): Promise<FooterSocialLink[]> {
  const { data, error } = await supabase
    .from('footer_social_links')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    console.error('Error fetching footer social links:', error)
    throw error
  }

  return data || []
}

export async function createFooterSocialLink(socialData: FooterSocialLinkFormData): Promise<FooterSocialLink> {
  const { data, error } = await supabase
    .from('footer_social_links')
    .insert([socialData])
    .select()
    .single()

  if (error) {
    console.error('Error creating footer social link:', error)
    throw error
  }

  return data
}

export async function updateFooterSocialLink(id: string, socialData: Partial<FooterSocialLinkFormData>): Promise<FooterSocialLink> {
  const { data, error } = await supabase
    .from('footer_social_links')
    .update(socialData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating footer social link:', error)
    throw error
  }

  return data
}

export async function deleteFooterSocialLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('footer_social_links')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting footer social link:', error)
    throw error
  }
}

export async function updateFooterSocialLinksOrder(operations: FooterSortOperation[]): Promise<void> {
  const { error } = await supabase.rpc('update_footer_social_links_order', {
    updates: operations
  })

  if (error) {
    console.error('Error updating footer social links order:', error)
    // Fallback to individual updates if RPC doesn't exist
    for (const op of operations) {
      await updateFooterSocialLink(op.id, { display_order: op.display_order })
    }
  }
}

// Footer Settings
export async function getFooterSettings(): Promise<FooterSetting[]> {
  const { data, error } = await supabase
    .from('footer_settings')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching footer settings:', error)
    throw error
  }

  return data || []
}

export async function updateFooterSetting(key: string, settingData: Partial<FooterSettingFormData>): Promise<FooterSetting> {
  const { data, error } = await supabase
    .from('footer_settings')
    .upsert([{ setting_key: key, ...settingData }])
    .select()
    .single()

  if (error) {
    console.error('Error updating footer setting:', error)
    throw error
  }

  return data
}

// Get complete footer data for rendering
export async function getCompleteFooterData(): Promise<FooterData> {
  try {
    const [categories, socialLinks, settings] = await Promise.all([
      getFooterCategories(),
      getFooterSocialLinks(),
      getFooterSettings()
    ])

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting
      return acc
    }, {} as Record<string, FooterSetting>)

    return {
      categories,
      socialLinks,
      settings: settingsMap
    }
  } catch (error) {
    console.error('Error fetching complete footer data:', error)
    throw error
  }
}

// Validation functions
export function validateFooterCategoryData(data: FooterCategoryFormData): string[] {
  const errors: string[] = []

  if (!data.title_ko?.trim()) {
    errors.push('Korean title is required')
  }

  if (data.display_order < 0) {
    errors.push('Display order must be non-negative')
  }

  return errors
}

export function validateFooterLinkData(data: FooterLinkFormData): string[] {
  const errors: string[] = []

  if (!data.title_ko?.trim()) {
    errors.push('Korean title is required')
  }

  if (!data.url?.trim()) {
    errors.push('URL is required')
  }

  if (!data.category_id?.trim()) {
    errors.push('Category is required')
  }

  if (data.display_order < 0) {
    errors.push('Display order must be non-negative')
  }

  // Basic URL validation
  if (data.url && !data.url.match(/^(https?:\/\/|\/|#)/)) {
    errors.push('URL must be a valid HTTP/HTTPS URL, relative path, or hash link')
  }

  return errors
}

export function validateFooterSocialLinkData(data: FooterSocialLinkFormData): string[] {
  const errors: string[] = []

  if (!data.platform?.trim()) {
    errors.push('Platform is required')
  }

  if (!data.icon_name?.trim()) {
    errors.push('Icon name is required')
  }

  if (!data.url?.trim()) {
    errors.push('URL is required')
  }

  if (data.display_order < 0) {
    errors.push('Display order must be non-negative')
  }

  // URL validation for social links (should be external)
  if (data.url && !data.url.match(/^https?:\/\//)) {
    errors.push('Social media URL must be a valid HTTP/HTTPS URL')
  }

  return errors
}