// Custom MUI theme for premium, modern look
import { createTheme } from '@mui/material/styles';

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#4F8A8B', // Soft teal
    contrastText: '#fff',
  },
  secondary: {
    main: '#F9ED69', // Soft yellow
    contrastText: '#222',
  },
  background: {
    default: '#F7FAFC',
    paper: '#fff',
  },
  text: {
    primary: '#222',
    secondary: '#6B7280',
  },
  error: {
    main: '#FF6F61',
  },
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#4F8A8B',
    contrastText: '#fff',
  },
  secondary: {
    main: '#F9ED69',
    contrastText: '#222',
  },
  background: {
    default: '#181A1B',
    paper: '#232526',
  },
  text: {
    primary: '#fff',
    secondary: '#B0B3B8',
  },
  error: {
    main: '#FF6F61',
  },
};

const theme = (mode = 'light') =>
  createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      h1: { fontFamily: '"Sora", "Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: '2.6rem', letterSpacing: '-0.6px' },
      h2: { fontFamily: '"Sora", "Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '2.05rem' },
      h3: { fontFamily: '"Sora", "Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '1.55rem' },
      h4: { fontFamily: '"Sora", "Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '1.3rem' },
      body1: { fontSize: '1.05rem' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shadows: [
      'none',
      '0px 2px 8px rgba(79,138,139,0.08)',
      ...Array(23).fill('0px 4px 24px rgba(79,138,139,0.10)'),
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: '0px 2px 8px rgba(79,138,139,0.08)',
            transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            boxShadow: '0px 4px 24px rgba(79,138,139,0.10)',
            transition: 'box-shadow 0.2s cubic-bezier(.4,0,.2,1)',
          },
        },
      },
    },
  });

export default theme;
