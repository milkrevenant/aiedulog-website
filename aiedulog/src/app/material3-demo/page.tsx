'use client'

import { useState } from 'react'
import { 
  M3Button, 
  M3TextField, 
  M3FAB, 
  M3Card, 
  M3Chip, 
  M3IconButton 
} from '@/components/material3'
import '@/app/theme/material3-tokens.css'

export default function Material3Demo() {
  const [textValue, setTextValue] = useState('')
  const [selectedChips, setSelectedChips] = useState<number[]>([])

  const toggleChip = (index: number) => {
    setSelectedChips(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <div style={{ 
      padding: '24px', 
      minHeight: '100vh', 
      backgroundColor: 'var(--md-sys-color-background)',
      fontFamily: "'Noto Sans KR', 'IBM Plex Sans KR', system-ui, sans-serif"
    }}>
      <h1 style={{ 
        fontSize: 'var(--md-sys-typescale-display-small-size)',
        lineHeight: 'var(--md-sys-typescale-display-small-line-height)',
        color: 'var(--md-sys-color-on-background)',
        marginBottom: '32px',
        fontFamily: "'IBM Plex Sans KR', 'Noto Sans KR', system-ui, sans-serif",
        fontWeight: 700
      }}>
        Material 3 컴포넌트 데모
      </h1>

      {/* Buttons Section */}
      <M3Card variant="elevated">
        <h2 style={{ 
          fontSize: 'var(--md-sys-typescale-headline-small-size)',
          marginBottom: '16px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          Buttons
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <M3Button variant="filled" onClick={() => alert('Filled button clicked!')}>
            Filled Button
          </M3Button>
          <M3Button variant="outlined" onClick={() => console.log('Outlined')}>
            Outlined Button
          </M3Button>
          <M3Button variant="text">
            Text Button
          </M3Button>
          <M3Button variant="filled-tonal">
            Tonal Button
          </M3Button>
          <M3Button variant="elevated">
            Elevated Button
          </M3Button>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <M3Button variant="filled" icon="add" leading>
            With Icon
          </M3Button>
          <M3Button variant="outlined" icon="arrow_forward" trailing>
            Icon Trailing
          </M3Button>
          <M3Button variant="filled" disabled>
            Disabled
          </M3Button>
        </div>
      </M3Card>

      {/* Text Fields Section */}
      <M3Card variant="outlined" className="mt-4">
        <h2 style={{ 
          fontSize: 'var(--md-sys-typescale-headline-small-size)',
          marginBottom: '16px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          Text Fields
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <M3TextField
            variant="outlined"
            label="Outlined Text Field"
            placeholder="Enter text..."
            value={textValue}
            onChange={setTextValue}
          />
          
          <M3TextField
            variant="filled"
            label="Filled Text Field"
            placeholder="Enter text..."
            prefixText="$"
            suffixText=".00"
          />
          
          <M3TextField
            variant="outlined"
            label="Error State"
            error
            errorText="This field is required"
          />
          
          <M3TextField
            variant="outlined"
            label="Disabled Field"
            disabled
            value="Disabled content"
          />
        </div>
      </M3Card>

      {/* Icon Buttons Section */}
      <M3Card variant="filled" className="mt-4">
        <h2 style={{ 
          fontSize: 'var(--md-sys-typescale-headline-small-size)',
          marginBottom: '16px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          Icon Buttons
        </h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <M3IconButton icon="favorite" onClick={() => console.log('Standard')} />
          <M3IconButton icon="star" variant="filled" />
          <M3IconButton icon="bookmark" variant="filled-tonal" />
          <M3IconButton icon="share" variant="outlined" />
          <M3IconButton icon="favorite" toggle selected />
        </div>
      </M3Card>

      {/* Chips Section */}
      <M3Card variant="elevated" className="mt-4">
        <h2 style={{ 
          fontSize: 'var(--md-sys-typescale-headline-small-size)',
          marginBottom: '16px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          Chips
        </h2>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <M3Chip variant="assist" icon="event">
            Assist Chip
          </M3Chip>
          
          <M3Chip 
            variant="filter" 
            icon="filter_alt"
            selected={selectedChips.includes(0)}
            onClick={() => toggleChip(0)}
          >
            Filter Chip
          </M3Chip>
          
          <M3Chip 
            variant="filter"
            selected={selectedChips.includes(1)}
            onClick={() => toggleChip(1)}
          >
            No Icon
          </M3Chip>
          
          <M3Chip variant="suggestion" icon="lightbulb">
            Suggestion
          </M3Chip>
          
          <M3Chip 
            variant="input" 
            onRemove={() => console.log('Removed')}
          >
            Input Chip
          </M3Chip>
        </div>
      </M3Card>

      {/* FAB Section */}
      <M3Card variant="outlined" className="mt-4">
        <h2 style={{ 
          fontSize: 'var(--md-sys-typescale-headline-small-size)',
          marginBottom: '16px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          Floating Action Buttons
        </h2>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <M3FAB icon="add" size="small" onClick={() => console.log('Small FAB')} />
          <M3FAB icon="edit" size="medium" variant="primary" />
          <M3FAB icon="navigation" size="large" variant="secondary" />
          <M3FAB icon="favorite" variant="tertiary" label="Extended FAB" />
          <M3FAB icon="star" variant="branded" />
        </div>
      </M3Card>

      {/* Color Palette */}
      <M3Card variant="elevated" className="mt-4">
        <h2 style={{ 
          fontSize: 'var(--md-sys-typescale-headline-small-size)',
          marginBottom: '16px',
          color: 'var(--md-sys-color-on-surface)'
        }}>
          Material 3 Color System
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)'
          }}>
            Primary
          </div>
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-secondary)',
            color: 'var(--md-sys-color-on-secondary)'
          }}>
            Secondary
          </div>
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-tertiary)',
            color: 'var(--md-sys-color-on-tertiary)'
          }}>
            Tertiary
          </div>
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-error)',
            color: 'var(--md-sys-color-on-error)'
          }}>
            Error
          </div>
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-surface-variant)',
            color: 'var(--md-sys-color-on-surface-variant)'
          }}>
            Surface Variant
          </div>
          <div style={{ 
            padding: '16px', 
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-surface)',
            color: 'var(--md-sys-color-on-surface)',
            border: '1px solid var(--md-sys-color-outline)'
          }}>
            Surface
          </div>
        </div>
      </M3Card>

      <style jsx>{`
        .mt-4 {
          margin-top: 24px;
        }
      `}</style>
    </div>
  )
}