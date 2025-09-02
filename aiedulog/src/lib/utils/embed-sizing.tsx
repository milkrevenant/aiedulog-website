'use client'

import React from 'react'
import {
  PhoneAndroid,
  Tablet,
  Computer,
  Tv,
  Settings
} from '@mui/icons-material'

/**
 * Embed Sizing Utilities for Microsoft Loop-style embeds
 * 
 * Handles responsive sizing, resize state, and size persistence
 */

export interface EmbedSizeState {
  size: 'small' | 'medium' | 'large' | 'custom'
  customWidth?: number
  customHeight?: number
  isResizing?: boolean
}

export interface SizeConfiguration {
  width: number
  height: number
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
}

export const SIZE_PRESETS_CONFIGS: Record<string, Record<EmbedSizeState['size'], SizeConfiguration>> = {
  excalidraw: {
    small: { width: 800, height: 400, minWidth: 600, maxWidth: 1000, minHeight: 300, maxHeight: 600 },
    medium: { width: 1200, height: 600, minWidth: 800, maxWidth: 1400, minHeight: 400, maxHeight: 800 },
    large: { width: 1600, height: 800, minWidth: 1200, maxWidth: 2000, minHeight: 600, maxHeight: 1200 },
    custom: { width: 1200, height: 600, minWidth: 400, maxWidth: 2000, minHeight: 200, maxHeight: 1200 }
  },
  kanban: {
    small: { width: 600, height: 400, minWidth: 500, maxWidth: 800, minHeight: 300, maxHeight: 600 },
    medium: { width: 900, height: 500, minWidth: 700, maxWidth: 1200, minHeight: 400, maxHeight: 800 },
    large: { width: 1200, height: 600, minWidth: 1000, maxWidth: 1600, minHeight: 500, maxHeight: 1000 },
    custom: { width: 900, height: 500, minWidth: 400, maxWidth: 1600, minHeight: 200, maxHeight: 1000 }
  },
  todo: {
    small: { width: 400, height: 300, minWidth: 300, maxWidth: 600, minHeight: 200, maxHeight: 500 },
    medium: { width: 600, height: 400, minWidth: 400, maxWidth: 800, minHeight: 300, maxHeight: 700 },
    large: { width: 800, height: 500, minWidth: 600, maxWidth: 1200, minHeight: 400, maxHeight: 900 },
    custom: { width: 600, height: 400, minWidth: 300, maxWidth: 1200, minHeight: 150, maxHeight: 900 }
  },
  poll: {
    small: { width: 300, height: 250, minWidth: 250, maxWidth: 500, minHeight: 150, maxHeight: 400 },
    medium: { width: 500, height: 350, minWidth: 350, maxWidth: 700, minHeight: 200, maxHeight: 600 },
    large: { width: 700, height: 450, minWidth: 500, maxWidth: 1000, minHeight: 300, maxHeight: 800 },
    custom: { width: 500, height: 350, minWidth: 250, maxWidth: 1000, minHeight: 100, maxHeight: 800 }
  },
  document: {
    small: { width: 500, height: 400, minWidth: 400, maxWidth: 700, minHeight: 300, maxHeight: 600 },
    medium: { width: 800, height: 600, minWidth: 600, maxWidth: 1000, minHeight: 400, maxHeight: 900 },
    large: { width: 1000, height: 800, minWidth: 800, maxWidth: 1400, minHeight: 600, maxHeight: 1200 },
    custom: { width: 800, height: 600, minWidth: 400, maxWidth: 1400, minHeight: 200, maxHeight: 1200 }
  }
}

/**
 * Get default size state for embed type
 */
export function getDefaultSizeState(type: string): EmbedSizeState {
  return {
    size: 'medium'
  }
}

/**
 * Get size configuration for current state
 */
export function getSizeConfig(sizeState: EmbedSizeState, type: string = 'document'): SizeConfiguration {
  const presets = SIZE_PRESETS_CONFIGS[type] || SIZE_PRESETS_CONFIGS.document
  
  if (sizeState.size === 'custom' && sizeState.customWidth && sizeState.customHeight) {
    const customPreset = presets.custom
    return {
      width: sizeState.customWidth,
      height: sizeState.customHeight,
      minWidth: customPreset.minWidth,
      maxWidth: customPreset.maxWidth,
      minHeight: customPreset.minHeight,
      maxHeight: customPreset.maxHeight
    }
  }
  
  return presets[sizeState.size] || presets.medium
}

/**
 * Get responsive size based on container width
 */
export function getResponsiveSize(
  containerWidth: number, 
  sizeState: EmbedSizeState, 
  type: string = 'document'
): SizeConfiguration {
  const config = getSizeConfig(sizeState, type)
  
  // Adjust width to fit container with some padding
  const maxAllowedWidth = Math.min(containerWidth - 40, config.maxWidth)
  const responsiveWidth = Math.min(config.width, maxAllowedWidth)
  
  // Maintain aspect ratio if needed
  const aspectRatio = config.height / config.width
  const responsiveHeight = Math.min(
    config.height,
    Math.max(config.minHeight, responsiveWidth * aspectRatio)
  )
  
  return {
    ...config,
    width: Math.max(config.minWidth, responsiveWidth),
    height: Math.max(config.minHeight, responsiveHeight)
  }
}

/**
 * Load size preference from localStorage
 */
export function loadSizePreference(type: string): EmbedSizeState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(`embed_size_${type}`)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn(`Failed to load size preference for ${type}:`, error)
  }
  
  return null
}

/**
 * Save size preference to localStorage
 */
export function saveSizePreference(type: string, sizeState: EmbedSizeState): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(`embed_size_${type}`, JSON.stringify(sizeState))
  } catch (error) {
    console.warn(`Failed to save size preference for ${type}:`, error)
  }
}

/**
 * Calculate optimal size for embed type
 */
export function calculateOptimalSize(
  type: string,
  containerWidth: number,
  containerHeight: number
): EmbedSizeState {
  const presets = SIZE_PRESETS_CONFIGS[type] || SIZE_PRESETS_CONFIGS.document
  
  // Find the largest preset that fits
  const sizes: (keyof typeof presets)[] = ['large', 'medium', 'small']
  
  for (const size of sizes) {
    const config = presets[size]
    if (config.width <= containerWidth - 40 && config.height <= containerHeight - 100) {
      return { size }
    }
  }
  
  // If none fit, create custom size
  return {
    size: 'custom',
    customWidth: Math.min(presets.small.width, containerWidth - 40),
    customHeight: Math.min(presets.small.height, containerHeight - 100)
  }
}

/**
 * Validate size state
 */
export function validateSizeState(sizeState: EmbedSizeState, type: string): EmbedSizeState {
  const presets = SIZE_PRESETS_CONFIGS[type] || SIZE_PRESETS_CONFIGS.document
  
  if (sizeState.size === 'custom') {
    const customPreset = presets.custom
    
    return {
      ...sizeState,
      customWidth: sizeState.customWidth ? Math.max(
        customPreset.minWidth,
        Math.min(customPreset.maxWidth, sizeState.customWidth)
      ) : customPreset.width,
      customHeight: sizeState.customHeight ? Math.max(
        customPreset.minHeight,
        Math.min(customPreset.maxHeight, sizeState.customHeight)
      ) : customPreset.height
    }
  }
  
  // Ensure size is valid
  if (!presets[sizeState.size]) {
    return { size: 'medium' }
  }
  
  return sizeState
}

/**
 * Create size state from dimensions
 */
export function createSizeState(
  width: number,
  height: number,
  type: string
): EmbedSizeState {
  const presets = SIZE_PRESETS_CONFIGS[type] || SIZE_PRESETS_CONFIGS.document
  
  // Check if dimensions match any preset
  const sizes: (keyof typeof presets)[] = ['small', 'medium', 'large']
  
  for (const size of sizes) {
    const config = presets[size]
    const widthMatch = Math.abs(config.width - width) <= 10
    const heightMatch = Math.abs(config.height - height) <= 10
    
    if (widthMatch && heightMatch) {
      return { size }
    }
  }
  
  // Create custom size
  return {
    size: 'custom',
    customWidth: width,
    customHeight: height
  }
}

/**
 * Get size label for display
 */
export function getSizeLabel(sizeState: EmbedSizeState): string {
  switch (sizeState.size) {
    case 'small':
      return 'Small'
    case 'medium':
      return 'Medium'
    case 'large':
      return 'Large'
    case 'custom':
      return sizeState.customWidth && sizeState.customHeight
        ? `${sizeState.customWidth} × ${sizeState.customHeight}`
        : 'Custom'
    default:
      return 'Medium'
  }
}

/**
 * Get available sizes for embed type
 */
export function getAvailableSizes(type: string): Array<{
  key: EmbedSizeState['size']
  label: string
  config: SizeConfiguration
}> {
  const presets = SIZE_PRESETS_CONFIGS[type] || SIZE_PRESETS_CONFIGS.document
  
  return Object.entries(presets).map(([key, config]) => ({
    key: key as EmbedSizeState['size'],
    label: key.charAt(0).toUpperCase() + key.slice(1),
    config
  }))
}

// Size presets for ResizeHandle component
export const SIZE_PRESETS = [
  { label: 'Mobile', value: 'mobile' as EmbedSizeState['size'], icon: <PhoneAndroid /> },
  { label: 'Tablet', value: 'tablet' as EmbedSizeState['size'], icon: <Tablet /> },
  { label: 'Small', value: 'small' as EmbedSizeState['size'], icon: <Computer /> },
  { label: 'Medium', value: 'medium' as EmbedSizeState['size'], icon: <Computer /> },
  { label: 'Large', value: 'large' as EmbedSizeState['size'], icon: <Computer /> },
  { label: 'X-Large', value: 'xlarge' as EmbedSizeState['size'], icon: <Tv /> },
  { label: 'Custom', value: 'custom' as EmbedSizeState['size'], icon: <Settings /> }
]

// Validate dimensions within constraints
export function constrainDimensions(width: number, height: number, config: SizeConfiguration) {
  return {
    width: Math.max(config.minWidth, Math.min(config.maxWidth, width)),
    height: Math.max(config.minHeight, Math.min(config.maxHeight, height))
  }
}

export default {
  getDefaultSizeState,
  getSizeConfig,
  getResponsiveSize,
  loadSizePreference,
  saveSizePreference,
  calculateOptimalSize,
  validateSizeState,
  createSizeState,
  getSizeLabel,
  getAvailableSizes,
  constrainDimensions
}