import { createTheme, type PaletteMode } from '@mui/material/styles'

/** Tokens de la interfaz. */
export const tokens = {
  light: {
    ink: '#172033',
    bg: '#F2F4F7',
    paper: '#FFFFFF',
    line: '#E2E6EC',
    text: '#172033',
    text2: '#556070',
    muted: '#8A93A1',
    unidad: '#2a78d6',
    componente: '#eb6834',
    componenteSuave: '#FCE7DE',
    unidadSuave: '#E3EEFB',
    personas: '#172033',
    hombres: '#2a78d6',
    mujeres: '#1baf7a',
    otro: '#8A93A1',
    seq: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
    seqNaranja: ['#fde4d8', '#fac2a6', '#f59a72', '#eb6834', '#c9501f', '#9c3c15', '#6f2a0e'],
    critico: '#d03b3b',
    aviso: '#b7791f',
  },
  dark: {
    ink: '#0B1120',
    bg: '#0F1524',
    paper: '#161D2E',
    line: '#273046',
    text: '#EEF1F6',
    text2: '#B3BCCB',
    muted: '#7D8799',
    unidad: '#3987e5',
    componente: '#d95926',
    componenteSuave: '#3A2219',
    unidadSuave: '#17294A',
    personas: '#EEF1F6',
    hombres: '#3987e5',
    mujeres: '#199e70',
    otro: '#7D8799',
    seq: ['#1a2f52', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'],
    seqNaranja: ['#3a2219', '#6f2a0e', '#9c3c15', '#c9501f', '#d95926', '#f59a72', '#fac2a6'],
    critico: '#e66767',
    aviso: '#e0a63a',
  },
}
export type Tokens = typeof tokens.light

export const FUENTE_UI = "'Public Sans Variable', 'Segoe UI', system-ui, sans-serif"
export const FUENTE_DISPLAY = "'Archivo Variable', 'Public Sans Variable', system-ui, sans-serif"

export function crearTema(mode: PaletteMode) {
  const t = tokens[mode]
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#1E40AF' : '#6da7ec' },
      secondary: { main: t.componente },
      background: { default: t.bg, paper: t.paper },
      text: { primary: t.text, secondary: t.text2 },
      divider: t.line,
      error: { main: t.critico },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: FUENTE_UI,
      fontSize: 14,
      h1: { fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em', fontStretch: '110%' },
      h2: { fontFamily: FUENTE_DISPLAY, fontWeight: 650, fontSize: '1.125rem', fontStretch: '105%' },
      h3: { fontFamily: FUENTE_UI, fontWeight: 650, fontSize: '0.95rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem', color: t.text2 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontFeatureSettings: '"tnum" 1', backgroundColor: t.bg },
          '::selection': { background: t.unidadSuave },
          '*:focus-visible': { outline: `2px solid ${t.unidad}`, outlineOffset: 2 },
          '@media (prefers-reduced-motion: reduce)': {
            '*': { animation: 'none !important', transition: 'none !important' },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiChip: { styleOverrides: { root: { fontWeight: 550 } } },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: t.ink, fontSize: '0.75rem', padding: '6px 10px' } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.line, fontSize: '0.8125rem' },
          head: { fontWeight: 650, color: t.text2, fontSize: '0.75rem' },
        },
      },
    },
  })
}
