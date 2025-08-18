'use client'

import React, { useEffect, useRef, useState } from 'react'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'
import '@material/web/button/text-button'
import '@material/web/button/filled-tonal-button'
import '@material/web/button/elevated-button'
import '@material/web/textfield/outlined-text-field'
import '@material/web/textfield/filled-text-field'
import '@material/web/checkbox/checkbox'
import '@material/web/radio/radio'
import '@material/web/switch/switch'
import '@material/web/fab/fab'
import '@material/web/fab/branded-fab'
import '@material/web/iconbutton/icon-button'
import '@material/web/iconbutton/filled-icon-button'
import '@material/web/iconbutton/filled-tonal-icon-button'
import '@material/web/iconbutton/outlined-icon-button'
import '@material/web/chips/chip-set'
import '@material/web/chips/assist-chip'
import '@material/web/chips/filter-chip'
import '@material/web/chips/input-chip'
import '@material/web/chips/suggestion-chip'
import '@material/web/dialog/dialog'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/progress/circular-progress'
import '@material/web/progress/linear-progress'
import '@material/web/ripple/ripple'
import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'
import '@material/web/tabs/secondary-tab'
import '@material/web/icon/icon'

// Button wrapper component
interface M3ButtonProps {
  variant?: 'filled' | 'outlined' | 'text' | 'filled-tonal' | 'elevated'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  trailing?: boolean
  leading?: boolean
  icon?: string
  style?: React.CSSProperties
  className?: string
}

export const M3Button: React.FC<M3ButtonProps> = ({
  variant = 'filled',
  children,
  onClick,
  disabled,
  type = 'button',
  trailing,
  leading,
  icon,
  style,
  className
}) => {
  const ref = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (ref.current && onClick && mounted) {
      const element = ref.current
      element.addEventListener('click', onClick)
      return () => element.removeEventListener('click', onClick)
    }
  }, [onClick, mounted])

  const props = {
    ref,
    disabled,
    type,
    style,
    className,
    ...(trailing && { 'trailing-icon': true }),
    ...(leading && { 'leading-icon': true })
  }

  // Fallback for SSR
  if (!mounted) {
    return (
      <button 
        style={style} 
        className={className}
        disabled={disabled}
        type={type}
        onClick={onClick}
      >
        {icon && <span>{icon}</span>}
        {children}
      </button>
    )
  }

  const MdOutlinedButton = 'md-outlined-button' as any
  const MdTextButton = 'md-text-button' as any
  const MdFilledTonalButton = 'md-filled-tonal-button' as any
  const MdElevatedButton = 'md-elevated-button' as any
  const MdFilledButton = 'md-filled-button' as any

  switch (variant) {
    case 'outlined':
      return <MdOutlinedButton {...props}>{icon && <span className="material-icons" slot={leading ? 'icon' : trailing ? 'trailing-icon' : ''}>{icon}</span>}{children}</MdOutlinedButton>
    case 'text':
      return <MdTextButton {...props}>{icon && <span className="material-icons" slot={leading ? 'icon' : trailing ? 'trailing-icon' : ''}>{icon}</span>}{children}</MdTextButton>
    case 'filled-tonal':
      return <MdFilledTonalButton {...props}>{icon && <span className="material-icons" slot={leading ? 'icon' : trailing ? 'trailing-icon' : ''}>{icon}</span>}{children}</MdFilledTonalButton>
    case 'elevated':
      return <MdElevatedButton {...props}>{icon && <span className="material-icons" slot={leading ? 'icon' : trailing ? 'trailing-icon' : ''}>{icon}</span>}{children}</MdElevatedButton>
    default:
      return <MdFilledButton {...props}>{icon && <span className="material-icons" slot={leading ? 'icon' : trailing ? 'trailing-icon' : ''}>{icon}</span>}{children}</MdFilledButton>
  }
}

// TextField wrapper component
interface M3TextFieldProps {
  variant?: 'outlined' | 'filled'
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  type?: string
  error?: boolean
  errorText?: string
  disabled?: boolean
  required?: boolean
  prefixText?: string
  suffixText?: string
}

export const M3TextField: React.FC<M3TextFieldProps> = ({
  variant = 'outlined',
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  errorText,
  disabled,
  required,
  prefixText,
  suffixText
}) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (ref.current && onChange) {
      const element = ref.current as any
      const handleInput = (e: Event) => {
        onChange((e.target as any).value)
      }
      element.addEventListener('input', handleInput)
      return () => element.removeEventListener('input', handleInput)
    }
  }, [onChange])

  const props: any = {
    ref,
    label,
    placeholder,
    value,
    type,
    error,
    'error-text': errorText,
    disabled,
    required,
    'prefix-text': prefixText,
    'suffix-text': suffixText,
    style: { width: '100%' }  // TextField가 부모 너비를 채우도록
  }

  // Prevent hydration mismatch by not setting empty string attributes
  const MdFilledTextField = 'md-filled-text-field' as any
  const MdOutlinedTextField = 'md-outlined-text-field' as any
  
  if (variant === 'filled') {
    return <MdFilledTextField {...props} />
  }
  return <MdOutlinedTextField {...props} />
}

// FAB wrapper component
interface M3FABProps {
  children?: React.ReactNode
  icon?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'tertiary' | 'branded'
  onClick?: () => void
  label?: string
  style?: React.CSSProperties
}

export const M3FAB: React.FC<M3FABProps> = ({
  children,
  icon,
  size = 'medium',
  variant = 'primary',
  onClick,
  label,
  style
}) => {
  const ref = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (ref.current && onClick && mounted) {
      const element = ref.current
      element.addEventListener('click', onClick)
      return () => element.removeEventListener('click', onClick)
    }
  }, [onClick, mounted])

  // Fallback for SSR
  if (!mounted) {
    return (
      <button
        style={{
          ...style,
          width: size === 'large' ? '56px' : size === 'small' ? '40px' : '48px',
          height: size === 'large' ? '56px' : size === 'small' ? '40px' : '48px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'var(--md-sys-color-primary)',
          color: 'var(--md-sys-color-on-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--md-sys-elevation-level3)'
        }}
        onClick={onClick}
      >
        {icon && <span className="material-icons">{icon}</span>}
        {children}
      </button>
    )
  }

  const props = {
    ref,
    size,
    variant: variant !== 'branded' ? variant : undefined,
    label,
    style
  }

  const MdBrandedFab = 'md-branded-fab' as any
  const MdFab = 'md-fab' as any

  if (variant === 'branded') {
    return (
      <MdBrandedFab {...props}>
        {icon && <span className="material-icons" slot="icon">{icon}</span>}
        {children}
      </MdBrandedFab>
    )
  }

  return (
    <MdFab {...props}>
      {icon && <span className="material-icons" slot="icon">{icon}</span>}
      {children}
    </MdFab>
  )
}

// Card wrapper component (using native elements with Material 3 styling)
interface M3CardProps {
  children: React.ReactNode
  variant?: 'elevated' | 'filled' | 'outlined'
  onClick?: () => void
  className?: string
}

export const M3Card: React.FC<M3CardProps> = ({
  children,
  variant = 'elevated',
  onClick,
  className = ''
}) => {
  const baseStyles = {
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)',
    transition: 'all 0.2s ease'
  }

  const variantStyles = {
    elevated: {
      boxShadow: 'var(--md-sys-elevation-level1)'
    },
    filled: {
      backgroundColor: 'var(--md-sys-color-surface-variant)'
    },
    outlined: {
      border: '1px solid var(--md-sys-color-outline)',
      boxShadow: 'none'
    }
  }

  const MdRipple = 'md-ripple' as any
  
  return (
    <div 
      className={`m3-card ${className}`}
      style={{...baseStyles, ...variantStyles[variant]}}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {onClick && <MdRipple />}
      {children}
    </div>
  )
}

// Chip wrapper component
interface M3ChipProps {
  children: React.ReactNode
  variant?: 'assist' | 'filter' | 'input' | 'suggestion'
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  icon?: string
  avatar?: string
}

export const M3Chip: React.FC<M3ChipProps> = ({
  children,
  variant = 'assist',
  selected,
  onClick,
  onRemove,
  icon,
  avatar
}) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (ref.current) {
      const element = ref.current
      if (onClick) {
        element.addEventListener('click', onClick)
      }
      if (onRemove) {
        element.addEventListener('remove', onRemove)
      }
      return () => {
        if (onClick) element.removeEventListener('click', onClick)
        if (onRemove) element.removeEventListener('remove', onRemove)
      }
    }
  }, [onClick, onRemove])

  const props = {
    ref,
    selected,
    label: children
  }

  const MdFilterChip = 'md-filter-chip' as any
  const MdInputChip = 'md-input-chip' as any
  const MdSuggestionChip = 'md-suggestion-chip' as any
  const MdAssistChip = 'md-assist-chip' as any
  const MdIcon = 'md-icon' as any
  
  switch (variant) {
    case 'filter':
      return <MdFilterChip {...props}>{icon && <MdIcon slot="icon">{icon}</MdIcon>}</MdFilterChip>
    case 'input':
      return <MdInputChip {...props} remove={!!onRemove}>{avatar && <img slot="icon" src={avatar} />}{icon && <MdIcon slot="icon">{icon}</MdIcon>}</MdInputChip>
    case 'suggestion':
      return <MdSuggestionChip {...props}>{icon && <MdIcon slot="icon">{icon}</MdIcon>}</MdSuggestionChip>
    default:
      return <MdAssistChip {...props}>{icon && <MdIcon slot="icon">{icon}</MdIcon>}</MdAssistChip>
  }
}

// Icon Button wrapper
interface M3IconButtonProps {
  icon: string
  variant?: 'standard' | 'filled' | 'filled-tonal' | 'outlined'
  onClick?: () => void
  disabled?: boolean
  toggle?: boolean
  selected?: boolean
  style?: React.CSSProperties
}

export const M3IconButton: React.FC<M3IconButtonProps> = ({
  icon,
  variant = 'standard',
  onClick,
  disabled,
  toggle,
  selected,
  style
}) => {
  const ref = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (ref.current && onClick && mounted) {
      const element = ref.current
      element.addEventListener('click', onClick)
      return () => element.removeEventListener('click', onClick)
    }
  }, [onClick, mounted])

  const props = {
    ref,
    disabled,
    toggle,
    selected,
    style
  }

  // Fallback for SSR
  if (!mounted) {
    return (
      <button 
        style={{
          ...style,
          border: 'none',
          background: 'transparent',
          padding: '8px',
          borderRadius: '50%',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
        disabled={disabled}
        onClick={onClick}
      >
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </button>
    )
  }

  const iconElement = <span className="material-icons">{icon}</span>
  
  const MdFilledIconButton = 'md-filled-icon-button' as any
  const MdFilledTonalIconButton = 'md-filled-tonal-icon-button' as any
  const MdOutlinedIconButton = 'md-outlined-icon-button' as any
  const MdIconButton = 'md-icon-button' as any

  switch (variant) {
    case 'filled':
      return <MdFilledIconButton {...props}>{iconElement}</MdFilledIconButton>
    case 'filled-tonal':
      return <MdFilledTonalIconButton {...props}>{iconElement}</MdFilledTonalIconButton>
    case 'outlined':
      return <MdOutlinedIconButton {...props}>{iconElement}</MdOutlinedIconButton>
    default:
      return <MdIconButton {...props}>{iconElement}</MdIconButton>
  }
}

// Icon component wrapper
interface M3IconProps {
  children: string
  className?: string
}

export const M3Icon: React.FC<M3IconProps> = ({ children, className }) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <span 
        className={`material-icons ${className || ''}`}
        style={{ 
          width: '24px', 
          height: '24px', 
          display: 'inline-block',
          fontSize: '24px',
          lineHeight: 1,
          verticalAlign: 'middle'
        }}
      >
        {children}
      </span>
    )
  }
  
  return (
    <span 
      className={`material-icons ${className || ''}`}
      style={{ 
        fontSize: '24px',
        lineHeight: 1,
        verticalAlign: 'middle'
      }}
    >
      {children}
    </span>
  )
}

// Re-export custom components
export {
  M3AppBar,
  M3Toolbar,
  M3Avatar,
  M3Badge,
  M3Divider,
  M3Container,
  M3Stack,
  M3Box,
  M3Typography,
  M3Grid,
  M3Menu,
  M3MenuItem,
  M3Alert,
  M3CircularProgress,
  M3Checkbox,
  M3Skeleton,
  M3LinearProgress,
  M3Breadcrumbs,
  M3Link,
  M3Dialog,
  M3DialogTitle,
  M3DialogContent,
  M3DialogActions,
  M3Table,
  M3TableHead,
  M3TableBody,
  M3TableRow,
  M3TableCell,
  M3Select,
  M3Option
} from './custom-components'

// Export all components
export default {
  M3Button,
  M3TextField,
  M3FAB,
  M3Card,
  M3Chip,
  M3IconButton,
  M3Icon
}