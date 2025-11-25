/**
 * Footer Management System
 *
 * MIGRATION: Migrated to RDS server client (2025-10-14)
 */

import { createRDSClient } from '@/lib/db/rds-client'
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

const CATEGORY_TABLE = 'footer_categories'
const LINK_TABLE = 'footer_links'
const SOCIAL_TABLE = 'footer_social_links'
const SETTING_TABLE = 'footer_settings'

function getClient() {
  return createRDSClient()
}

function throwWithContext(context: string, error: { message?: string; code?: string; details?: unknown } | null) {
  console.error(context, error)
  throw new Error(error?.message || context)
}

function requireFirstRow<T>(rows: T[], context: string): T {
  const first = rows[0]
  if (!first) {
    throwWithContext(context, null)
  }
  return first
}

// Footer Categories
export async function getFooterCategories(): Promise<FooterCategory[]> {
  const rds = getClient()

  const { data: categoryRows, error: categoryError } = await rds
    .from(CATEGORY_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (categoryError) {
    throwWithContext('Error fetching footer categories', categoryError)
  }

  const categories = (categoryRows ?? []) as FooterCategory[]

  if (categories.length === 0) {
    return categories.map(category => ({ ...category, links: [] }))
  }

  const categoryIds = categories.map(category => category.id)

  const { data: linkRows, error: linkError } = await rds
    .from(LINK_TABLE)
    .select('*')
    .eq('is_active', true)
    .in('category_id', categoryIds)
    .order('display_order')

  if (linkError) {
    throwWithContext('Error fetching footer links for categories', linkError)
  }

  const links = (linkRows ?? []) as FooterLink[]
  const linksByCategory = new Map<string, FooterLink[]>()

  for (const link of links) {
    if (!linksByCategory.has(link.category_id)) {
      linksByCategory.set(link.category_id, [])
    }
    linksByCategory.get(link.category_id)!.push(link)
  }

  return categories.map(category => ({
    ...category,
    links: linksByCategory.get(category.id) ?? []
  }))
}

export async function createFooterCategory(categoryData: FooterCategoryFormData): Promise<FooterCategory> {
  const rds = getClient()
  const { data, error } = await rds.from(CATEGORY_TABLE).insert([categoryData])

  if (error) {
    throwWithContext('Error creating footer category', error)
  }

  const rows = (data ?? []) as FooterCategory[]
  return requireFirstRow(rows, 'Footer category creation returned no data')
}

export async function updateFooterCategory(id: string, categoryData: Partial<FooterCategoryFormData>): Promise<FooterCategory> {
  const rds = getClient()
  const { data, error } = await rds
    .from(CATEGORY_TABLE)
    .eq('id', id)
    .update(categoryData)

  if (error) {
    throwWithContext('Error updating footer category', error)
  }

  const rows = (data ?? []) as FooterCategory[]
  return requireFirstRow(rows, 'Footer category update returned no data')
}

export async function deleteFooterCategory(id: string): Promise<void> {
  const rds = getClient()
  const { error } = await rds.from(CATEGORY_TABLE).eq('id', id).delete()

  if (error) {
    throwWithContext('Error deleting footer category', error)
  }
}

export async function updateFooterCategoriesOrder(operations: FooterSortOperation[]): Promise<void> {
  const rds = getClient()
  const { error } = await rds.rpc('update_footer_categories_order', {
    updates: operations
  })

  if (error) {
    console.error('Error updating footer categories order via RPC, falling back to individual updates', error)
    for (const op of operations) {
      await updateFooterCategory(op.id, { display_order: op.display_order })
    }
  }
}

// Footer Links
export async function getFooterLinks(categoryId?: string): Promise<FooterLink[]> {
  const rds = getClient()
  let query = rds
    .from(LINK_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data: linkRows, error } = await query

  if (error) {
    throwWithContext('Error fetching footer links', error)
  }

  const links = (linkRows ?? []) as FooterLink[]

  if (links.length === 0) {
    return []
  }

  const categoryIds = Array.from(new Set(links.map(link => link.category_id).filter(Boolean)))

  if (categoryIds.length === 0) {
    return links
  }

  const { data: categoryRows, error: categoryError } = await rds
    .from(CATEGORY_TABLE)
    .select('*')
    .in('id', categoryIds)

  if (categoryError) {
    throwWithContext('Error fetching footer link categories', categoryError)
  }

  const categories = (categoryRows ?? []) as FooterCategory[]
  const categoryMap = new Map<string, FooterCategory>()
  for (const category of categories) {
    categoryMap.set(category.id, category)
  }

  return links.map(link => ({
    ...link,
    category: categoryMap.get(link.category_id)
  }))
}

export async function createFooterLink(linkData: FooterLinkFormData): Promise<FooterLink> {
  const rds = getClient()
  const { data, error } = await rds.from(LINK_TABLE).insert([linkData])

  if (error) {
    throwWithContext('Error creating footer link', error)
  }

  const rows = (data ?? []) as FooterLink[]
  return requireFirstRow(rows, 'Footer link creation returned no data')
}

export async function updateFooterLink(id: string, linkData: Partial<FooterLinkFormData>): Promise<FooterLink> {
  const rds = getClient()
  const { data, error } = await rds
    .from(LINK_TABLE)
    .eq('id', id)
    .update(linkData)

  if (error) {
    throwWithContext('Error updating footer link', error)
  }

  const rows = (data ?? []) as FooterLink[]
  return requireFirstRow(rows, 'Footer link update returned no data')
}

export async function deleteFooterLink(id: string): Promise<void> {
  const rds = getClient()
  const { error } = await rds.from(LINK_TABLE).eq('id', id).delete()

  if (error) {
    throwWithContext('Error deleting footer link', error)
  }
}

export async function updateFooterLinksOrder(operations: FooterSortOperation[]): Promise<void> {
  const rds = getClient()
  const { error } = await rds.rpc('update_footer_links_order', {
    updates: operations
  })

  if (error) {
    console.error('Error updating footer links order via RPC, falling back to individual updates', error)
    for (const op of operations) {
      await updateFooterLink(op.id, { display_order: op.display_order })
    }
  }
}

// Footer Social Links
export async function getFooterSocialLinks(): Promise<FooterSocialLink[]> {
  const rds = getClient()
  const { data, error } = await rds
    .from(SOCIAL_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    throwWithContext('Error fetching footer social links', error)
  }

  return (data ?? []) as FooterSocialLink[]
}

export async function createFooterSocialLink(socialData: FooterSocialLinkFormData): Promise<FooterSocialLink> {
  const rds = getClient()
  const { data, error } = await rds.from(SOCIAL_TABLE).insert([socialData])

  if (error) {
    throwWithContext('Error creating footer social link', error)
  }

  const rows = (data ?? []) as FooterSocialLink[]
  return requireFirstRow(rows, 'Footer social link creation returned no data')
}

export async function updateFooterSocialLink(id: string, socialData: Partial<FooterSocialLinkFormData>): Promise<FooterSocialLink> {
  const rds = getClient()
  const { data, error } = await rds
    .from(SOCIAL_TABLE)
    .eq('id', id)
    .update(socialData)

  if (error) {
    throwWithContext('Error updating footer social link', error)
  }

  const rows = (data ?? []) as FooterSocialLink[]
  return requireFirstRow(rows, 'Footer social link update returned no data')
}

export async function deleteFooterSocialLink(id: string): Promise<void> {
  const rds = getClient()
  const { error } = await rds.from(SOCIAL_TABLE).eq('id', id).delete()

  if (error) {
    throwWithContext('Error deleting footer social link', error)
  }
}

export async function updateFooterSocialLinksOrder(operations: FooterSortOperation[]): Promise<void> {
  const rds = getClient()
  const { error } = await rds.rpc('update_footer_social_links_order', {
    updates: operations
  })

  if (error) {
    console.error('Error updating footer social links order via RPC, falling back to individual updates', error)
    for (const op of operations) {
      await updateFooterSocialLink(op.id, { display_order: op.display_order })
    }
  }
}

// Footer Settings
export async function getFooterSettings(): Promise<FooterSetting[]> {
  const rds = getClient()
  const { data, error } = await rds
    .from(SETTING_TABLE)
    .select('*')
    .eq('is_active', true)

  if (error) {
    throwWithContext('Error fetching footer settings', error)
  }

  return (data ?? []) as FooterSetting[]
}

export async function updateFooterSetting(key: string, settingData: Partial<FooterSettingFormData>): Promise<FooterSetting> {
  const rds = getClient()
  const { data, error } = await rds
    .from(SETTING_TABLE)
    .upsert([{ setting_key: key, ...settingData }])

  if (error) {
    throwWithContext('Error updating footer setting', error)
  }

  const rows = (data ?? []) as FooterSetting[]
  return requireFirstRow(rows, 'Footer setting update returned no data')
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

  if (data.url && !data.url.match(/^https?:\/\//)) {
    errors.push('Social media URL must be a valid HTTP/HTTPS URL')
  }

  return errors
}
