import { useEffect, useRef, RefObject } from 'react'

/**
 * Hook that alerts clicks outside of the passed ref
 * @param handler - Function to call when click outside is detected
 * @param refs - Array of refs to exclude from outside click detection
 * @returns ref to attach to the element
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  refs?: RefObject<HTMLElement>[]
): RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node

      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(target)) {
        return
      }

      // Check if click is inside any of the additional refs
      if (refs) {
        for (const additionalRef of refs) {
          if (additionalRef.current && additionalRef.current.contains(target)) {
            return
          }
        }
      }

      // Check if the target is the backdrop/overlay element
      const targetElement = target as HTMLElement
      if (targetElement.classList?.contains('MuiBackdrop-root') || 
          targetElement.classList?.contains('MuiDrawer-root')) {
        handler()
        return
      }

      handler()
    }

    // Add event listeners
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [handler, refs])

  return ref
}

/**
 * Alternative implementation that works with MUI Drawer component
 * Specifically handles MUI Drawer backdrop clicks
 */
export function useDrawerClickOutside(
  open: boolean,
  onClose: () => void,
  excludeRefs?: RefObject<HTMLElement>[]
) {
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Check if click is on backdrop
      if (target.classList?.contains('MuiBackdrop-root')) {
        onClose()
        return
      }

      // Check if click is outside drawer paper
      const drawerPaper = document.querySelector('.MuiDrawer-paper')
      if (drawerPaper && !drawerPaper.contains(target)) {
        // Check excluded refs (like the button that opens the drawer)
        if (excludeRefs) {
          for (const ref of excludeRefs) {
            if (ref.current && ref.current.contains(target)) {
              return
            }
          }
        }
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Delay to avoid immediate close when opening
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose, excludeRefs])
}