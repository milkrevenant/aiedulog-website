'use client'

import React, { useState } from 'react'
import '@material/web/icon/icon'
import '@material/web/ripple/ripple'

// Type declarations for Material 3 web components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-ripple': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Forward declaration for M3Icon (imported from index.tsx to avoid circular dependency)
const M3Icon = ({ children }: { children: string }) => {
  const MdIcon = 'md-icon' as any
  return <MdIcon>{children}</MdIcon>
}

// M3AppBar Component
interface M3AppBarProps {
  children: React.ReactNode
  variant?: 'center' | 'small' | 'medium' | 'large'
  elevated?: boolean
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute'
  className?: string
}

export const M3AppBar: React.FC<M3AppBarProps> = ({
  children,
  variant = 'center',
  elevated = false,
  position = 'sticky',
  className = ''
}) => {
  const elevationClass = elevated ? 'elevation-2' : ''
  
  return (
    <header 
      className={`m3-app-bar m3-app-bar--${variant} ${elevationClass} ${className}`}
      style={{
        position,
        top: position === 'fixed' || position === 'sticky' ? 0 : undefined,
        zIndex: 1200,
        width: '100%',
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
        boxShadow: elevated ? 'var(--md-sys-elevation-level2)' : 'none',
        transition: 'box-shadow 0.2s ease'
      }}
    >
      <div style={{
        minHeight: variant === 'small' ? '64px' : variant === 'large' ? '152px' : variant === 'medium' ? '112px' : '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px'
      }}>
        {children}
      </div>
    </header>
  )
}

// M3Toolbar Component
interface M3ToolbarProps {
  children: React.ReactNode
  className?: string
}

export const M3Toolbar: React.FC<M3ToolbarProps> = ({ children, className = '' }) => {
  return (
    <div 
      className={`m3-toolbar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: '64px',
        padding: '0 8px',
        gap: '8px'
      }}
    >
      {children}
    </div>
  )
}

// M3Avatar Component
interface M3AvatarProps {
  src?: string
  alt?: string
  children?: React.ReactNode
  size?: 'small' | 'medium' | 'large' | 'xlarge'
  variant?: 'circle' | 'rounded'
  onClick?: () => void
  className?: string
}

export const M3Avatar: React.FC<M3AvatarProps> = ({
  src,
  alt = '',
  children,
  size = 'medium',
  variant = 'circle',
  onClick,
  className = ''
}) => {
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 56,
    xlarge: 96
  }
  
  const dimension = sizeMap[size]
  
  return (
    <div 
      className={`m3-avatar m3-avatar--${size} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
        borderRadius: variant === 'circle' ? '50%' : 'var(--md-sys-shape-corner-full)',
        backgroundColor: src ? 'transparent' : 'var(--md-sys-color-primary)',
        color: 'var(--md-sys-color-on-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${dimension / 2.5}px`,
        fontWeight: 500,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {src ? (
        <img 
          src={src} 
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        children
      )}
      {onClick && (() => {
        const MdRipple = 'md-ripple' as any
        return <MdRipple />
      })()}
    </div>
  )
}

// M3Badge Component
interface M3BadgeProps {
  children: React.ReactNode
  badgeContent?: React.ReactNode
  color?: 'error' | 'primary' | 'secondary' | 'tertiary'
  variant?: 'standard' | 'small' | 'large'
  invisible?: boolean
  max?: number
  className?: string
}

export const M3Badge: React.FC<M3BadgeProps> = ({
  children,
  badgeContent,
  color = 'error',
  variant = 'standard',
  invisible = false,
  max = 99,
  className = ''
}) => {
  const displayContent = typeof badgeContent === 'number' && badgeContent > max 
    ? `${max}+` 
    : badgeContent

  const sizeStyles = {
    small: { minWidth: '16px', height: '16px', fontSize: '10px', padding: '0 4px' },
    standard: { minWidth: '20px', height: '20px', fontSize: '12px', padding: '0 6px' },
    large: { minWidth: '24px', height: '24px', fontSize: '14px', padding: '0 8px' }
  }

  const colorMap = {
    error: 'var(--md-sys-color-error)',
    primary: 'var(--md-sys-color-primary)',
    secondary: 'var(--md-sys-color-secondary)',
    tertiary: 'var(--md-sys-color-tertiary)'
  }

  const onColorMap = {
    error: 'var(--md-sys-color-on-error)',
    primary: 'var(--md-sys-color-on-primary)',
    secondary: 'var(--md-sys-color-on-secondary)',
    tertiary: 'var(--md-sys-color-on-tertiary)'
  }

  return (
    <div 
      className={`m3-badge ${className}`}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {!invisible && badgeContent !== undefined && badgeContent !== 0 && (
        <span
          style={{
            position: 'absolute',
            top: variant === 'small' ? '-4px' : '-8px',
            right: variant === 'small' ? '-4px' : '-8px',
            backgroundColor: colorMap[color],
            color: onColorMap[color],
            borderRadius: 'var(--md-sys-shape-corner-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 500,
            ...sizeStyles[variant]
          }}
        >
          {displayContent}
        </span>
      )}
    </div>
  )
}

// M3Divider Component
interface M3DividerProps {
  variant?: 'full' | 'inset' | 'middle'
  orientation?: 'horizontal' | 'vertical'
  className?: string
  style?: React.CSSProperties
}

export const M3Divider: React.FC<M3DividerProps> = ({
  variant = 'full',
  orientation = 'horizontal',
  className = '',
  style = {}
}) => {
  const marginMap = {
    full: 0,
    inset: orientation === 'horizontal' ? '0 0 0 16px' : '16px 0 0 0',
    middle: orientation === 'horizontal' ? '0 16px' : '16px 0'
  }

  return (
    <div
      className={`m3-divider ${className}`}
      role="separator"
      style={{
        backgroundColor: 'var(--md-sys-color-outline-variant)',
        margin: marginMap[variant],
        ...(orientation === 'horizontal' 
          ? { height: '1px', width: '100%' }
          : { width: '1px', height: '100%', display: 'inline-block' }),
        ...style
      }}
    />
  )
}

// M3Container Component (replaces MUI Container)
interface M3ContainerProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false
  className?: string
}

export const M3Container: React.FC<M3ContainerProps> = ({
  children,
  maxWidth = 'lg',
  className = ''
}) => {
  const maxWidthMap = {
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px'
  }

  return (
    <div
      className={`m3-container ${className}`}
      style={{
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '24px',
        paddingRight: '24px',
        maxWidth: maxWidth ? maxWidthMap[maxWidth] : undefined,
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  )
}

// M3Stack Component (replaces MUI Stack)
interface M3StackProps {
  children: React.ReactNode
  direction?: 'row' | 'column'
  spacing?: number
  alignItems?: string
  justifyContent?: string
  className?: string
}

export const M3Stack: React.FC<M3StackProps> = ({
  children,
  direction = 'column',
  spacing = 2,
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  className = ''
}) => {
  return (
    <div
      className={`m3-stack ${className}`}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: `${spacing * 8}px`,
        alignItems,
        justifyContent
      }}
    >
      {children}
    </div>
  )
}

// M3Box Component (replaces MUI Box)
interface M3BoxProps {
  children?: React.ReactNode
  sx?: React.CSSProperties
  className?: string
  onClick?: () => void
  component?: keyof JSX.IntrinsicElements
}

export const M3Box: React.FC<M3BoxProps> = ({
  children,
  sx = {},
  className = '',
  onClick,
  component: Component = 'div'
}) => {
  return React.createElement(
    Component,
    {
      className: `m3-box ${className}`,
      style: sx,
      onClick: onClick
    },
    children
  )
}

// M3Typography Component (replaces MUI Typography)
interface M3TypographyProps {
  children: React.ReactNode
  variant?: 'display-large' | 'display-medium' | 'display-small' | 
            'headline-large' | 'headline-medium' | 'headline-small' |
            'title-large' | 'title-medium' | 'title-small' |
            'body-large' | 'body-medium' | 'body-small' |
            'label-large' | 'label-medium' | 'label-small'
  component?: keyof JSX.IntrinsicElements
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'inherit'
  align?: 'left' | 'center' | 'right' | 'justify'
  gutterBottom?: boolean
  noWrap?: boolean
  className?: string
  sx?: React.CSSProperties
}

export const M3Typography: React.FC<M3TypographyProps> = ({
  children,
  variant = 'body-medium',
  component,
  color = 'inherit',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  className = '',
  sx = {}
}) => {
  const variantMap: Record<string, string> = {
    'display-large': 'h1',
    'display-medium': 'h1',
    'display-small': 'h2',
    'headline-large': 'h2',
    'headline-medium': 'h3',
    'headline-small': 'h4',
    'title-large': 'h5',
    'title-medium': 'h6',
    'title-small': 'h6',
    'body-large': 'p',
    'body-medium': 'p',
    'body-small': 'p',
    'label-large': 'span',
    'label-medium': 'span',
    'label-small': 'span'
  }

  const Component = component || variantMap[variant] || 'span'

  const colorMap = {
    primary: 'var(--md-sys-color-primary)',
    secondary: 'var(--md-sys-color-secondary)',
    tertiary: 'var(--md-sys-color-tertiary)',
    error: 'var(--md-sys-color-error)',
    inherit: 'inherit'
  }

  const typographyStyles = {
    'display-large': { fontSize: 'var(--md-sys-typescale-display-large-size)', lineHeight: 'var(--md-sys-typescale-display-large-line-height)' },
    'display-medium': { fontSize: 'var(--md-sys-typescale-display-medium-size)', lineHeight: 'var(--md-sys-typescale-display-medium-line-height)' },
    'display-small': { fontSize: 'var(--md-sys-typescale-display-small-size)', lineHeight: 'var(--md-sys-typescale-display-small-line-height)' },
    'headline-large': { fontSize: 'var(--md-sys-typescale-headline-large-size)', lineHeight: 'var(--md-sys-typescale-headline-large-line-height)' },
    'headline-medium': { fontSize: 'var(--md-sys-typescale-headline-medium-size)', lineHeight: 'var(--md-sys-typescale-headline-medium-line-height)' },
    'headline-small': { fontSize: 'var(--md-sys-typescale-headline-small-size)', lineHeight: 'var(--md-sys-typescale-headline-small-line-height)' },
    'title-large': { fontSize: 'var(--md-sys-typescale-title-large-size)', lineHeight: 'var(--md-sys-typescale-title-large-line-height)' },
    'title-medium': { fontSize: 'var(--md-sys-typescale-title-medium-size)', lineHeight: 'var(--md-sys-typescale-title-medium-line-height)' },
    'title-small': { fontSize: 'var(--md-sys-typescale-title-small-size)', lineHeight: 'var(--md-sys-typescale-title-small-line-height)' },
    'body-large': { fontSize: 'var(--md-sys-typescale-body-large-size)', lineHeight: 'var(--md-sys-typescale-body-large-line-height)' },
    'body-medium': { fontSize: 'var(--md-sys-typescale-body-medium-size)', lineHeight: 'var(--md-sys-typescale-body-medium-line-height)' },
    'body-small': { fontSize: 'var(--md-sys-typescale-body-small-size)', lineHeight: 'var(--md-sys-typescale-body-small-line-height)' },
    'label-large': { fontSize: 'var(--md-sys-typescale-label-large-size)', lineHeight: 'var(--md-sys-typescale-label-large-line-height)' },
    'label-medium': { fontSize: 'var(--md-sys-typescale-label-medium-size)', lineHeight: 'var(--md-sys-typescale-label-medium-line-height)' },
    'label-small': { fontSize: 'var(--md-sys-typescale-label-small-size)', lineHeight: 'var(--md-sys-typescale-label-small-line-height)' }
  }

  return React.createElement(
    Component,
    {
      className: `m3-typography m3-typography--${variant} ${className}`,
      style: {
        ...typographyStyles[variant],
        color: colorMap[color],
        textAlign: align,
        marginBottom: gutterBottom ? '0.35em' : undefined,
        whiteSpace: noWrap ? 'nowrap' : undefined,
        overflow: noWrap ? 'hidden' : undefined,
        textOverflow: noWrap ? 'ellipsis' : undefined,
        fontFamily: variant.includes('display') || variant.includes('headline') 
          ? 'var(--md-sys-typescale-font-family-brand)'
          : 'var(--md-sys-typescale-font-family-plain)',
        ...sx
      }
    },
    children
  )
}

// M3Grid Component (CSS Grid based)
interface M3GridProps {
  children: React.ReactNode
  container?: boolean
  item?: boolean
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
  spacing?: number
  className?: string
}

export const M3Grid: React.FC<M3GridProps> = ({
  children,
  container = false,
  item = false,
  xs,
  sm,
  md,
  lg,
  xl,
  spacing = 2,
  className = ''
}) => {
  if (container) {
    return (
      <div
        className={`m3-grid-container ${className}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: `${spacing * 8}px`,
          width: '100%'
        }}
      >
        {children}
      </div>
    )
  }

  const getGridColumn = () => {
    // Priority: xs -> sm -> md -> lg -> xl
    const size = xs || sm || md || lg || xl || 12
    return `span ${size}`
  }

  return (
    <div
      className={`m3-grid-item ${className}`}
      style={{
        gridColumn: getGridColumn()
      }}
    >
      {children}
    </div>
  )
}

// M3Menu Component (Custom implementation)
interface M3MenuProps {
  children: React.ReactNode
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  className?: string
}

export const M3Menu: React.FC<M3MenuProps> = ({
  children,
  open,
  anchorEl,
  onClose,
  className = ''
}) => {
  if (!open || !anchorEl) return null

  const rect = anchorEl.getBoundingClientRect()
  
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1299,
          backgroundColor: 'transparent',
        }}
        onClick={onClose}
      />
      {/* Menu */}
      <div
        className={`m3-menu ${className}`}
        style={{
          position: 'fixed',
          top: rect.bottom + 8,
          right: Math.max(8, window.innerWidth - rect.right),
          zIndex: 1300,
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderRadius: 'var(--md-sys-shape-corner-extra-small)',
          boxShadow: 'var(--md-sys-elevation-level2)',
          minWidth: '200px',
          padding: '8px 0',
          animation: 'menuOpen 0.2s ease-out'
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @keyframes menuOpen {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

// M3MenuItem Component
interface M3MenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ReactNode
  className?: string
}

export const M3MenuItem: React.FC<M3MenuItemProps> = ({
  children,
  onClick,
  icon,
  className = ''
}) => {
  return (
    <div
      className={`m3-menu-item ${className}`}
      onClick={onClick}
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        fontSize: 'var(--md-sys-typescale-body-large-size)',
        lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
        color: 'var(--md-sys-color-on-surface)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-on-surface-variant)20'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{children}</span>
      {(() => {
        const MdRipple = 'md-ripple' as any
        return <MdRipple />
      })()}
    </div>
  )
}

// M3Alert Component (Banner style)
interface M3AlertProps {
  children: React.ReactNode
  severity?: 'error' | 'warning' | 'info' | 'success'
  className?: string
}

export const M3Alert: React.FC<M3AlertProps> = ({
  children,
  severity = 'info',
  className = ''
}) => {
  const severityColors = {
    error: {
      bg: 'var(--md-sys-color-error-container)',
      color: 'var(--md-sys-color-on-error-container)',
      icon: 'error'
    },
    warning: {
      bg: '#fff3e0',
      color: '#e65100',
      icon: 'warning'
    },
    info: {
      bg: 'var(--md-sys-color-primary-container)',
      color: 'var(--md-sys-color-on-primary-container)',
      icon: 'info'
    },
    success: {
      bg: '#e8f5e9',
      color: '#2e7d32',
      icon: 'check_circle'
    }
  }

  const colors = severityColors[severity]

  return (
    <div
      className={`m3-alert ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.color,
        padding: '12px 16px',
        borderRadius: 'var(--md-sys-shape-corner-small)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: 'var(--md-sys-typescale-body-medium-size)',
        lineHeight: 'var(--md-sys-typescale-body-medium-line-height)'
      }}
    >
      <M3Icon>{colors.icon}</M3Icon>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

// M3CircularProgress Component
interface M3CircularProgressProps {
  size?: number
  color?: 'primary' | 'secondary' | 'tertiary' | 'inherit'
  className?: string
}

export const M3CircularProgress: React.FC<M3CircularProgressProps> = ({
  size = 24,
  color = 'primary',
  className = ''
}) => {
  const colorMap = {
    primary: 'var(--md-sys-color-primary)',
    secondary: 'var(--md-sys-color-secondary)',
    tertiary: 'var(--md-sys-color-tertiary)',
    inherit: 'currentColor'
  }

  return (
    <div
      className={`m3-circular-progress ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-block'
      }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{
          animation: 'rotate 1.4s linear infinite',
          width: '100%',
          height: '100%'
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke={colorMap[color]}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="0"
          style={{
            animation: 'dash 1.4s ease-in-out infinite'
          }}
        />
      </svg>
      <style jsx>{`
        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes dash {
          0% {
            stroke-dasharray: 1 62.8;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 31.4 31.4;
            stroke-dashoffset: -15.7;
          }
          100% {
            stroke-dasharray: 1 62.8;
            stroke-dashoffset: -62.8;
          }
        }
      `}</style>
    </div>
  )
}

// M3Checkbox Component
interface M3CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export const M3Checkbox: React.FC<M3CheckboxProps> = ({
  checked = false,
  onChange,
  disabled = false,
  className = ''
}) => {
  return (
    <div
      className={`m3-checkbox ${className}`}
      onClick={() => !disabled && onChange?.(!checked)}
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '2px',
        border: `2px solid ${checked ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'}`,
        backgroundColor: checked ? 'var(--md-sys-color-primary)' : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6L5 9L10 3"
            stroke="var(--md-sys-color-on-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}

// M3Skeleton Component
interface M3SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular'
  width?: number | string
  height?: number | string
  animation?: 'pulse' | 'wave' | false
  className?: string
}

export const M3Skeleton: React.FC<M3SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className = ''
}) => {
  const getStyles = () => {
    const base: React.CSSProperties = {
      backgroundColor: 'var(--md-sys-color-surface-variant)',
      opacity: 0.4,
      width: width || (variant === 'text' ? '100%' : undefined),
      height: height || (variant === 'text' ? '1.2em' : '100%'),
      display: 'inline-block'
    }

    if (variant === 'circular') {
      base.borderRadius = '50%'
      base.width = width || 40
      base.height = height || 40
    } else if (variant === 'rectangular') {
      base.borderRadius = 'var(--md-sys-shape-corner-small)'
    } else {
      base.borderRadius = 'var(--md-sys-shape-corner-extra-small)'
    }

    if (animation === 'pulse') {
      base.animation = 'skeleton-pulse 1.5s ease-in-out infinite'
    } else if (animation === 'wave') {
      base.animation = 'skeleton-wave 1.6s linear infinite'
    }

    return base
  }

  return (
    <>
      <span className={`m3-skeleton ${className}`} style={getStyles()} />
      <style jsx>{`
        @keyframes skeleton-pulse {
          0% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 0.4;
          }
        }
        @keyframes skeleton-wave {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  )
}

// M3LinearProgress Component
interface M3LinearProgressProps {
  variant?: 'determinate' | 'indeterminate'
  value?: number
  height?: number
  color?: 'primary' | 'secondary' | 'tertiary'
  className?: string
}

export const M3LinearProgress: React.FC<M3LinearProgressProps> = ({
  variant = 'indeterminate',
  value = 0,
  height = 4,
  color = 'primary',
  className = ''
}) => {
  const colorMap = {
    primary: 'var(--md-sys-color-primary)',
    secondary: 'var(--md-sys-color-secondary)',
    tertiary: 'var(--md-sys-color-tertiary)'
  }

  return (
    <div
      className={`m3-linear-progress ${className}`}
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'var(--md-sys-color-surface-variant)',
        borderRadius: 'var(--md-sys-shape-corner-full)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        style={{
          height: '100%',
          backgroundColor: colorMap[color],
          borderRadius: 'var(--md-sys-shape-corner-full)',
          ...(variant === 'determinate'
            ? { width: `${Math.min(100, Math.max(0, value))}%`, transition: 'width 0.3s ease' }
            : { width: '40%', animation: 'linear-progress 1.5s ease-in-out infinite' })
        }}
      />
      <style jsx>{`
        @keyframes linear-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  )
}

// M3Breadcrumbs Component
interface M3BreadcrumbsProps {
  children: React.ReactNode
  separator?: React.ReactNode
  className?: string
}

export const M3Breadcrumbs: React.FC<M3BreadcrumbsProps> = ({
  children,
  separator = '›',
  className = ''
}) => {
  const items = React.Children.toArray(children)
  
  return (
    <nav
      className={`m3-breadcrumbs ${className}`}
      aria-label="breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: 'var(--md-sys-typescale-body-medium-size)',
        lineHeight: 'var(--md-sys-typescale-body-medium-line-height)',
        color: 'var(--md-sys-color-on-surface-variant)'
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item}
          {index < items.length - 1 && (
            <span
              style={{
                margin: '0 8px',
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: 'var(--md-sys-typescale-body-medium-size)'
              }}
            >
              {separator}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// M3Dialog Component
interface M3DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export const M3Dialog: React.FC<M3DialogProps> = ({
  open,
  onClose,
  children,
  className = ''
}) => {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1998,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        className={`m3-dialog ${className}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          borderRadius: 'var(--md-sys-shape-corner-extra-large)',
          boxShadow: 'var(--md-sys-elevation-level4)',
          minWidth: '280px',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'auto',
          zIndex: 1999,
          animation: 'dialogOpen 0.3s ease-out'
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialogOpen {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  )
}

// M3DialogTitle Component
interface M3DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export const M3DialogTitle: React.FC<M3DialogTitleProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`m3-dialog-title ${className}`}
      style={{
        padding: '24px 24px 16px',
        fontSize: 'var(--md-sys-typescale-headline-small-size)',
        lineHeight: 'var(--md-sys-typescale-headline-small-line-height)',
        fontWeight: 500,
        color: 'var(--md-sys-color-on-surface)'
      }}
    >
      {children}
    </div>
  )
}

// M3DialogContent Component
interface M3DialogContentProps {
  children: React.ReactNode
  className?: string
}

export const M3DialogContent: React.FC<M3DialogContentProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`m3-dialog-content ${className}`}
      style={{
        padding: '0 24px 24px',
        fontSize: 'var(--md-sys-typescale-body-medium-size)',
        lineHeight: 'var(--md-sys-typescale-body-medium-line-height)',
        color: 'var(--md-sys-color-on-surface-variant)'
      }}
    >
      {children}
    </div>
  )
}

// M3DialogActions Component
interface M3DialogActionsProps {
  children: React.ReactNode
  className?: string
}

export const M3DialogActions: React.FC<M3DialogActionsProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`m3-dialog-actions ${className}`}
      style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px'
      }}
    >
      {children}
    </div>
  )
}

// M3Link Component
interface M3LinkProps {
  children: React.ReactNode
  href?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  underline?: 'hover' | 'always' | 'none'
  color?: 'primary' | 'secondary' | 'inherit'
  className?: string
}

export const M3Link: React.FC<M3LinkProps> = ({
  children,
  href = '#',
  onClick,
  underline = 'hover',
  color = 'primary',
  className = ''
}) => {
  const colorMap = {
    primary: 'var(--md-sys-color-primary)',
    secondary: 'var(--md-sys-color-secondary)',
    inherit: 'inherit'
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className={`m3-link ${className}`}
      style={{
        color: colorMap[color],
        textDecoration: underline === 'always' ? 'underline' : 'none',
        cursor: 'pointer',
        transition: 'text-decoration 0.2s ease',
        ...(underline === 'hover' && {
          ':hover': {
            textDecoration: 'underline'
          }
        })
      }}
      onMouseEnter={(e) => {
        if (underline === 'hover') {
          e.currentTarget.style.textDecoration = 'underline'
        }
      }}
      onMouseLeave={(e) => {
        if (underline === 'hover') {
          e.currentTarget.style.textDecoration = 'none'
        }
      }}
    >
      {children}
    </a>
  )
}

// M3Table Components
interface M3TableProps {
  children: React.ReactNode
  className?: string
}

export const M3Table: React.FC<M3TableProps> = ({ children, className = '' }) => {
  return (
    <table
      className={`m3-table ${className}`}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 'var(--md-sys-typescale-body-medium-size)',
        color: 'var(--md-sys-color-on-surface)'
      }}
    >
      {children}
    </table>
  )
}

interface M3TableHeadProps {
  children: React.ReactNode
  className?: string
}

export const M3TableHead: React.FC<M3TableHeadProps> = ({ children, className = '' }) => {
  return (
    <thead
      className={`m3-table-head ${className}`}
      style={{
        backgroundColor: 'var(--md-sys-color-surface-variant)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)'
      }}
    >
      {children}
    </thead>
  )
}

interface M3TableBodyProps {
  children: React.ReactNode
  className?: string
}

export const M3TableBody: React.FC<M3TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`m3-table-body ${className}`}>
      {children}
    </tbody>
  )
}

interface M3TableRowProps {
  children: React.ReactNode
  hover?: boolean
  className?: string
  onClick?: () => void
}

export const M3TableRow: React.FC<M3TableRowProps> = ({ 
  children, 
  hover = false, 
  className = '',
  onClick 
}) => {
  return (
    <tr
      className={`m3-table-row ${className}`}
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        cursor: onClick ? 'pointer' : 'default',
        transition: hover ? 'background-color 0.2s ease' : undefined
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-variant)20'
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      {children}
    </tr>
  )
}

interface M3TableCellProps {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

export const M3TableCell: React.FC<M3TableCellProps> = ({ 
  children, 
  align = 'left',
  className = '' 
}) => {
  return (
    <td
      className={`m3-table-cell ${className}`}
      style={{
        padding: '12px 16px',
        textAlign: align,
        fontSize: 'var(--md-sys-typescale-body-medium-size)',
        color: 'var(--md-sys-color-on-surface)'
      }}
    >
      {children}
    </td>
  )
}

// M3Select Component
interface M3SelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export const M3Select: React.FC<M3SelectProps> = ({
  value,
  onChange,
  label,
  children,
  disabled = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  return (
    <div className={`m3-select ${className}`} style={{ position: 'relative', width: '100%' }}>
      <div
        ref={setAnchorEl}
        onClick={() => !disabled && setOpen(!open)}
        style={{
          padding: '12px 16px',
          borderRadius: 'var(--md-sys-shape-corner-small)',
          border: '1px solid var(--md-sys-color-outline)',
          backgroundColor: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.38 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '48px',
          fontSize: 'var(--md-sys-typescale-body-large-size)'
        }}
      >
        <div>
          {label && (
            <div style={{
              fontSize: 'var(--md-sys-typescale-body-small-size)',
              color: 'var(--md-sys-color-on-surface-variant)',
              marginBottom: '2px'
            }}>
              {label}
            </div>
          )}
          <div>{value}</div>
        </div>
        <M3Icon>{open ? 'arrow_drop_up' : 'arrow_drop_down'}</M3Icon>
      </div>
      {open && anchorEl && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1299,
              backgroundColor: 'transparent'
            }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderRadius: 'var(--md-sys-shape-corner-small)',
              boxShadow: 'var(--md-sys-elevation-level2)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1300
            }}
          >
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<any>, {
                  onClick: () => {
                    onChange((child.props as any).value)
                    setOpen(false)
                  }
                })
              }
              return child
            })}
          </div>
        </>
      )}
    </div>
  )
}

interface M3OptionProps {
  value: string
  children: React.ReactNode
  onClick?: () => void
}

export const M3Option: React.FC<M3OptionProps> = ({ value, children, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        fontSize: 'var(--md-sys-typescale-body-large-size)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-on-surface-variant)20'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </div>
  )
}

// Export all custom components
export default {
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
}