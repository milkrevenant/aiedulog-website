'use client'

/**
 * Unified Chat Sizing Integration System
 * 
 * Provides consistent sizing across chat bubbles, embeds, and other components
 */

export interface SizingConfig {
  width: number
  height: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  resizable?: boolean
}

export type ComponentType = 'default' | 'excalidraw' | 'kanban' | 'todo' | 'poll'

const DEFAULT_SIZES: Record<ComponentType, SizingConfig> = {
  default: {
    width: 400,
    height: 0, // Auto height
    minWidth: 200,
    maxWidth: 800,
    minHeight: 40,
    resizable: true
  },
  excalidraw: {
    width: 1200,
    height: 600,
    minWidth: 600,
    maxWidth: 1600,
    minHeight: 300,
    maxHeight: 1000,
    resizable: true
  },
  kanban: {
    width: 800,
    height: 500,
    minWidth: 600,
    maxWidth: 1400,
    minHeight: 400,
    maxHeight: 800,
    resizable: true
  },
  todo: {
    width: 600,
    height: 400,
    minWidth: 400,
    maxWidth: 1000,
    minHeight: 200,
    maxHeight: 800,
    resizable: true
  },
  poll: {
    width: 500,
    height: 300,
    minWidth: 300,
    maxWidth: 800,
    minHeight: 200,
    maxHeight: 600,
    resizable: true
  }
}

class ChatSizingManager {
  private sizes = new Map<string, SizingConfig>()
  
  constructor() {
    this.loadFromStorage()
  }
  
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    
    Object.keys(DEFAULT_SIZES).forEach(type => {
      try {
        const stored = localStorage.getItem(`sizing_${type}`)
        if (stored && stored !== 'undefined' && stored !== '') {
          const config = JSON.parse(stored)
          if (config && typeof config === 'object') {
            this.sizes.set(type, { ...DEFAULT_SIZES[type as ComponentType], ...config })
          }
        }
      } catch (error) {
        console.warn(`Failed to parse stored sizing for ${type}:`, error)
        // Clean up corrupted data
        localStorage.removeItem(`sizing_${type}`)
      }
    })
  }
  
  private saveToStorage(type: string, config: SizingConfig): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(`sizing_${type}`, JSON.stringify(config))
    } catch (error) {
      console.warn(`Failed to save sizing for ${type}:`, error)
    }
  }
  
  getConfig(type: ComponentType): SizingConfig {
    return this.sizes.get(type) || DEFAULT_SIZES[type] || DEFAULT_SIZES.default
  }
  
  updateSize(type: ComponentType, width: number, height?: number): void {
    const current = this.getConfig(type)
    const updated = {
      ...current,
      width: Math.max(current.minWidth || 0, Math.min(current.maxWidth || Infinity, width)),
      height: height !== undefined 
        ? Math.max(current.minHeight || 0, Math.min(current.maxHeight || Infinity, height))
        : current.height
    }
    
    this.sizes.set(type, updated)
    this.saveToStorage(type, updated)
  }
  
  updateCustomSize(type: ComponentType, width: number, height: number): void {
    this.updateSize(type, width, height)
  }
  
  resetToDefault(type: ComponentType): void {
    const defaultConfig = DEFAULT_SIZES[type] || DEFAULT_SIZES.default
    this.sizes.set(type, defaultConfig)
    this.saveToStorage(type, defaultConfig)
  }
  
  resetAll(): void {
    Object.keys(DEFAULT_SIZES).forEach(type => {
      this.resetToDefault(type as ComponentType)
    })
  }
}

// Global sizing manager instance
const sizingManager = new ChatSizingManager()

export function initializeUnifiedSizing(): void {
  // Already initialized on creation
  console.log('Unified sizing system initialized')
}

export function useChatSizing(type: ComponentType) {
  const config = sizingManager.getConfig(type)
  
  return {
    width: config.width,
    height: config.height,
    minWidth: config.minWidth,
    maxWidth: config.maxWidth,
    minHeight: config.minHeight,
    maxHeight: config.maxHeight,
    resizable: config.resizable,
    
    updateCustomSize: (width: number, height?: number) => {
      sizingManager.updateCustomSize(type, width, height || config.height)
    },
    
    resetToDefault: () => {
      sizingManager.resetToDefault(type)
    }
  }
}

export function getSizingConfig(type: ComponentType): SizingConfig {
  return sizingManager.getConfig(type)
}

export function updateGlobalSize(type: ComponentType, width: number, height?: number): void {
  sizingManager.updateSize(type, width, height)
}

export default sizingManager