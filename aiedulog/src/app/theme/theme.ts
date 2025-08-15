'use client'

import { createTheme } from '@mui/material/styles'

// Material 3 Design System 적용
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#006494', // Dynamic Blue
      light: '#4a90ba',
      dark: '#004066',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#525e00', // Complementary Green
      light: '#7a8a33',
      dark: '#373f00',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#6b5778', // Tertiary Purple
      light: '#947f9f',
      dark: '#4a3a50',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ba1a1a',
      light: '#ffb4ab',
      dark: '#93000a',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb547',
      dark: '#c66900',
      contrastText: '#000000',
    },
    info: {
      main: '#0288d1',
      light: '#5eb8ff',
      dark: '#005b9f',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
      contrastText: '#000000',
    },
    background: {
      default: '#fdfcff',
      paper: '#ffffff',
    },
    surface: {
      default: '#fdfcff',
      variant: '#dfe2eb',
    },
    text: {
      primary: '#1a1c1e',
      secondary: '#43474e',
    },
  },
  typography: {
    fontFamily: [
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'Roboto',
      'Helvetica Neue',
      'Segoe UI',
      'Apple SD Gothic Neo',
      'Noto Sans KR',
      'Malgun Gothic',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '3.5rem',
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: -0.25,
    },
    h2: {
      fontSize: '2.75rem',
      fontWeight: 400,
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    h3: {
      fontSize: '2.25rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    h4: {
      fontSize: '2rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: 0.25,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: 0.15,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: 0.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: 0.25,
    },
  },
  shape: {
    borderRadius: 12, // Material 3 rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20, // Fully rounded buttons
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
})

// Custom Material 3 colors
declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary']
    surface: {
      default: string
      variant: string
    }
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary']
    surface?: {
      default?: string
      variant?: string
    }
  }
}