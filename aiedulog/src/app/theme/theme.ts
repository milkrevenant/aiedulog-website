'use client'

import { createTheme } from '@mui/material/styles'

// Material Theme Colors from material-theme.json
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3B608F',
      light: '#6EAEFF',
      dark: '#204876',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#805611',
      light: '#F5BC6F',
      dark: '#633F00',
      contrastText: '#FFFFFF',
    },
    tertiary: {
      main: '#5A5891',
      light: '#E3DFFF',
      dark: '#434078',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#904A45',
      light: '#FFDAD6',
      dark: '#73332F',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F5A623',
      light: '#FFDDB4',
      dark: '#633F00',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#5A5891',
      light: '#E3DFFF',
      dark: '#434078',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#52C41A',
      light: '#95DE64',
      dark: '#389E0D',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FF',
      paper: '#FFFFFF',
    },
    surface: {
      default: '#F7F9FF',
      variant: '#DCE3E9',
    },
    text: {
      primary: '#191C20',
      secondary: '#41484D',
    },
  },
  typography: {
    fontFamily: [
      'Noto Sans KR',
      'IBM Plex Sans KR',
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'Roboto',
      'Helvetica Neue',
      'Segoe UI',
      'Apple SD Gothic Neo',
      'Malgun Gothic',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: -0.25,
      fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", sans-serif',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: 0,
      fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", sans-serif',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: 0,
      fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", sans-serif',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: 0.25,
      fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", sans-serif',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
      letterSpacing: 0.15,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: 0.15,
      fontFamily: '"Noto Sans KR", "IBM Plex Sans KR", sans-serif',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: 0.1,
      fontFamily: '"Noto Sans KR", "IBM Plex Sans KR", sans-serif',
    },
    button: {
      fontFamily: '"Noto Sans KR", "IBM Plex Sans KR", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
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