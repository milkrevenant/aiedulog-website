/**
 * Secure Storage Utility
 * Encrypts sensitive data before storing in localStorage
 */

class SecureStorageImpl {
  private readonly storageKey = 'aiedulog_secure'
  private readonly encryptionKey: string

  constructor() {
    // Generate or retrieve encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey()
  }

  private getOrCreateEncryptionKey(): string {
    const storedKey = 'aiedulog-security-2024'
    return storedKey + (typeof window !== 'undefined' ? window.location.origin : 'server')
  }

  private encrypt(data: string): string {
    try {
      // Simple XOR encryption with key rotation
      let encrypted = ''
      const key = this.encryptionKey
      
      for (let i = 0; i < data.length; i++) {
        const keyChar = key.charCodeAt(i % key.length)
        const dataChar = data.charCodeAt(i)
        encrypted += String.fromCharCode(dataChar ^ keyChar)
      }
      
      // Base64 encode the result
      return btoa(encrypted)
    } catch (error) {
      console.error('Encryption error:', error)
      return btoa(data) // Fallback to simple base64
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      // Base64 decode first
      const encrypted = atob(encryptedData)
      
      // XOR decrypt
      let decrypted = ''
      const key = this.encryptionKey
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length)
        const encryptedChar = encrypted.charCodeAt(i)
        decrypted += String.fromCharCode(encryptedChar ^ keyChar)
      }
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      try {
        // Fallback: try simple base64 decode
        return atob(encryptedData)
      } catch {
        return ''
      }
    }
  }

  /**
   * Store encrypted data in localStorage
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return

    try {
      const encryptedValue = this.encrypt(value)
      const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}')
      storageData[key] = {
        value: encryptedValue,
        timestamp: Date.now(),
        encrypted: true
      }
      localStorage.setItem(this.storageKey, JSON.stringify(storageData))
    } catch (error) {
      console.error('SecureStorage setItem error:', error)
      // Fallback to regular localStorage
      localStorage.setItem(`fallback_${key}`, value)
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null

    try {
      const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}')
      const item = storageData[key]
      
      if (!item) {
        // Check fallback storage
        return localStorage.getItem(`fallback_${key}`)
      }

      if (item.encrypted) {
        return this.decrypt(item.value)
      } else {
        return item.value
      }
    } catch (error) {
      console.error('SecureStorage getItem error:', error)
      // Fallback to regular localStorage
      return localStorage.getItem(`fallback_${key}`)
    }
  }

  /**
   * Remove item from secure storage
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return

    try {
      const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}')
      delete storageData[key]
      localStorage.setItem(this.storageKey, JSON.stringify(storageData))
      
      // Also remove fallback
      localStorage.removeItem(`fallback_${key}`)
    } catch (error) {
      console.error('SecureStorage removeItem error:', error)
    }
  }

  /**
   * Clear all secure storage data
   */
  clear(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.storageKey)
      
      // Remove all fallback items
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('fallback_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('SecureStorage clear error:', error)
    }
  }

  /**
   * Get all stored keys
   */
  getAllKeys(): string[] {
    if (typeof window === 'undefined') return []

    try {
      const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}')
      return Object.keys(storageData)
    } catch (error) {
      console.error('SecureStorage getAllKeys error:', error)
      return []
    }
  }

  /**
   * Clean up expired items (optional)
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    if (typeof window === 'undefined') return

    try {
      const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}')
      const now = Date.now()
      let hasChanges = false

      for (const [key, item] of Object.entries(storageData)) {
        const itemData = item as any
        if (itemData.timestamp && (now - itemData.timestamp) > maxAge) {
          delete storageData[key]
          hasChanges = true
        }
      }

      if (hasChanges) {
        localStorage.setItem(this.storageKey, JSON.stringify(storageData))
      }
    } catch (error) {
      console.error('SecureStorage cleanup error:', error)
    }
  }
}

// Export singleton instance
export const SecureStorage = new SecureStorageImpl()

// Also export the class for testing
export { SecureStorageImpl }