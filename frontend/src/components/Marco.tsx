import { Box, Drawer, IconButton, ListItemIcon, Menu, MenuItem, MenuItem as Opcion, Select, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material'
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined'
import ViewListOutlined from '@mui/icons-material/ViewListOutlined'
import GroupsOutlined from '@mui/icons-material/GroupsOutlined'
import MapOutlined from '@mui/icons-material/MapOutlined'
import TimelineRounded from '@mui/icons-material/TimelineRounded'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import TuneRounded from '@mui/icons-material/TuneRounded'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { query } from '../lib/api'
import { useCortes } from '../lib/datos'
import { MESES } from '../lib/formato'
import { useFiltros } from '../store/filtros'
import { puede, useSesion, type Rol } from '../store/sesion'
import { FUENTE_DISPLAY, tokens } from '../theme'
import { BarraFiltros } from './BarraFiltros'
import { useT } from './base'

const NAV: { ruta: string; texto: string; icono: ReactNode; rol: Rol; grupo: 'tablero' | 'datos' }[] = [
  { ruta: '/', texto: 'Inicio', icono: <SpaceDashboardOutlined />, rol: 'consulta', grupo: 'tablero' },
  { ruta: '/servicios', texto: 'Servicios', icono: <ViewListOutlined />, rol: 'consulta', grupo: 'tablero' },
  { ruta: '/personas', texto: 'Personas', icono: <GroupsOutlined />, rol: 'consulta', grupo: 'tablero' },
  { ruta: '/territorio', texto: 'Territorio', icono: <MapOutlined />, rol: 'consulta', grupo: 'tablero' },
  { ruta: '/evolucion', texto: 'Evolución', icono: <TimelineRounded />, rol: 'consulta', grupo: 'tablero' },
  { ruta: '/vulnerabilidad', texto: 'Vulnerabilidad', icono: <ShieldOutlined />, rol: 'admin', grupo: 'tablero' },
  { ruta: '/cargas', texto: 'Cargas', icono: <UploadFileOutlined />, rol: 'analista', grupo: 'datos' },
  { ruta: '/calidad', texto: 'Calidad del dato', icono: <FactCheckOutlined />, rol: 'analista', grupo: 'datos' },
  { ruta: '/admin', texto: 'Administración', icono: <TuneRounded />, rol: 'admin', grupo: 'datos' },
]
const SIN_FILTROS = ['/cargas', '/calidad', '/admin']

const ANCHO_ABIERTO = 240
const ANCHO_COLAPSADO = 72
const CLAVE_COLAPSO = 'analitica.menu.colapsado'
const MOV = 'cubic-bezier(.4, 0, .2, 1)'
const SIN_MOVIMIENTO = '@media (prefers-reduced-motion: reduce)'

/** Texto que se desliza y se desvanece al colapsar el menú, sin saltos de layout. */
function Etiqueta({ colapsado, children, sx }: { colapsado: boolean; children: ReactNode; sx?: object }) {
  return (
    <Box component="span" sx={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap',
      maxWidth: colapsado ? 0 : 180, opacity: colapsado ? 0 : 1, ml: colapsado ? 0 : 1.5,
      transition: `max-width .28s ${MOV}, margin .28s ${MOV}, opacity ${colapsado ? '.12s' : '.2s .08s'} ease`,
      [SIN_MOVIMIENTO]: { transition: 'none' }, ...sx }}>
      {children}
    </Box>
  )
}

function Navegacion({ alNavegar, colapsado = false }: { alNavegar?: () => void; colapsado?: boolean }) {
  const u = useSesion((s) => s.usuario)
  const item = (n: (typeof NAV)[number]) => (
    <Tooltip key={n.ruta} title={colapsado ? n.texto : ''} placement="right" arrow disableInteractive>
      <Box component={NavLink} to={n.ruta} end={n.ruta === '/'} onClick={alNavegar} aria-label={n.texto}
        sx={{ display: 'flex', alignItems: 'center', px: '14px', py: 1, borderRadius: '10px', color: '#AEB8C9',
          textDecoration: 'none', fontSize: 14, fontWeight: 500, position: 'relative', overflow: 'hidden',
          transition: `background-color .18s ease, color .18s ease`,
          '& svg': { fontSize: 20, flexShrink: 0, transition: 'color .18s ease, transform .18s ease' },
          '&:hover': { bgcolor: 'rgba(255,255,255,.06)', color: '#fff' },
          '&:hover svg': { transform: 'scale(1.08)' },
          '&:focus-visible': { outline: '2px solid #6da7ec', outlineOffset: -2 },
          '&.active': { bgcolor: 'rgba(57,135,229,.16)', color: '#fff', fontWeight: 650 },
          '&.active::before': { content: '""', position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: '0 2px 2px 0',
            bgcolor: '#3987e5' },
          '&.active svg': { color: '#6da7ec' },
          [SIN_MOVIMIENTO]: { '&:hover svg': { transform: 'none' } } }}>
        {n.icono}<Etiqueta colapsado={colapsado}>{n.texto}</Etiqueta>
      </Box>
    </Tooltip>
  )
  const visibles = NAV.filter((n) => puede(u, n.rol))
  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#121A2B', color: '#fff', display: 'flex', flexDirection: 'column',
      px: 1.5, py: 2.5, overflowX: 'hidden', overflowY: 'auto' }}>
      <Box sx={{ px: '9px', mb: 3, minHeight: 38 }}>
        <Stack direction="row" alignItems="center">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden style={{ flexShrink: 0 }}><rect width="32" height="32" rx="8" fill="#1d2840" />
            <path d="M7 23V13l5 4 6-7 7 6v7z" fill="#3987e5" /><circle cx="22.5" cy="9.5" r="3" fill="#eb6834" /></svg>
          <Etiqueta colapsado={colapsado} sx={{ ml: colapsado ? 0 : 1.25 }}>
            <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '115%', fontSize: 17, lineHeight: 1 }}>
              Analítica
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#8C97AB', mt: 0.4 }}>Unidad de Discapacidad</Typography>
          </Etiqueta>
        </Stack>
      </Box>
      <Stack gap={0.25}>{visibles.filter((n) => n.grupo === 'tablero').map(item)}</Stack>
      {visibles.some((n) => n.grupo === 'datos') && (
        <>
          {/* Con el menú abierto es un título; al colapsar se vuelve una línea separadora */}
          <Box sx={{ position: 'relative', height: 18, mt: 3, mb: 0.75, px: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: '#6F7A8F', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: '18px',
              opacity: colapsado ? 0 : 1, transition: `opacity ${colapsado ? '.1s' : '.2s .1s'} ease`, [SIN_MOVIMIENTO]: { transition: 'none' } }}>Datos</Typography>
            <Box aria-hidden sx={{ position: 'absolute', left: 14, right: 14, top: '50%', height: '1px', bgcolor: 'rgba(255,255,255,.12)',
              opacity: colapsado ? 1 : 0, transition: `opacity ${colapsado ? '.2s .1s' : '.1s'} ease`, [SIN_MOVIMIENTO]: { transition: 'none' } }} />
          </Box>
          <Stack gap={0.25}>{visibles.filter((n) => n.grupo === 'datos').map(item)}</Stack>
        </>
      )}
      <Box flex={1} />
      <Typography sx={{ fontSize: 11, color: '#6F7A8F', px: 1.5, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden',
        opacity: colapsado ? 0 : 1, maxHeight: colapsado ? 0 : 40, transition: `opacity ${colapsado ? '.1s' : '.2s .1s'} ease, max-height .28s ${MOV}`,
        [SIN_MOVIMIENTO]: { transition: 'none' } }}>
        Alcaldía de Medellín<br />Secretaría de Inclusión Social
      </Typography>
    </Box>
  )
}

/** Barra lateral de escritorio: se colapsa a solo iconos y recuerda la preferencia. */
function BarraLateral() {
  const [colapsado, setColapsado] = useState(() => {
    try { return localStorage.getItem(CLAVE_COLAPSO) === '1' } catch { return false }
  })
  const alternar = () => setColapsado((c) => {
    try { localStorage.setItem(CLAVE_COLAPSO, c ? '0' : '1') } catch { /* sin almacenamiento: solo en esta sesión */ }
    return !c
  })
  return (
    <Box component="aside" sx={{ width: colapsado ? ANCHO_COLAPSADO : ANCHO_ABIERTO, flexShrink: 0, position: 'sticky', top: 0,
      height: '100vh', zIndex: 1200, transition: `width .28s ${MOV}`, [SIN_MOVIMIENTO]: { transition: 'none' } }}>
      <Navegacion colapsado={colapsado} />
      <Tooltip title={colapsado ? 'Expandir menú' : 'Contraer menú'} placement="right" arrow disableInteractive>
        <IconButton onClick={alternar} size="small" aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'} aria-expanded={!colapsado}
          sx={{ position: 'absolute', top: 30, right: -13, width: 26, height: 26, zIndex: 2, color: '#AEB8C9',
            bgcolor: '#1d2840', border: '1px solid #2c3956', boxShadow: '0 2px 6px rgba(10,15,30,.25)',
            transition: 'background-color .18s ease, color .18s ease, border-color .18s ease',
            '&:hover': { bgcolor: '#3987e5', borderColor: '#3987e5', color: '#fff' },
            '&:focus-visible': { outline: '2px solid #6da7ec', outlineOffset: 2 } }}>
          <ChevronLeftRounded sx={{ fontSize: 18, transform: colapsado ? 'rotate(180deg)' : 'none', transition: `transform .28s ${MOV}`,
            [SIN_MOVIMIENTO]: { transition: 'none' } }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export function Marco({ titulo, descripcion, children }: { titulo: string; descripcion?: ReactNode; children: ReactNode }) {
  const t = useT()
  const movil = useMediaQuery('(max-width:1000px)')
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  const { usuario, salir, modo, alternarModo, token } = useSesion()
  const { corte, setCorte, filtros } = useFiltros()
  const { data } = useCortes()
  const [menu, setMenu] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // si el corte guardado ya no existe, vuelve al más reciente
    if (data && corte && !data.cortes.some((c) => c.id === corte)) setCorte(null)
  }, [data, corte, setCorte])

  const cortes = data?.cortes ?? []
  const exportar = () => {
    window.location.href = `/api/exportar${query({ corte, ...filtros, token: token ?? '' })}`
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: t.bg }}>
      {movil ? (
        <Drawer open={abierto} onClose={() => setAbierto(false)}>
          <Box sx={{ width: ANCHO_ABIERTO, height: '100%' }}><Navegacion alNavegar={() => setAbierto(false)} /></Box>
        </Drawer>
      ) : (
        <BarraLateral />
      )}
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: { xs: 2, md: 3.5 }, pt: 2.5, pb: 1.5 }} flexWrap="wrap">
          {movil && <IconButton onClick={() => setAbierto(true)} aria-label="Abrir menú"><MenuRounded /></IconButton>}
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h1">{titulo}</Typography>
            {descripcion && <Typography variant="body2" sx={{ color: t.text2, mt: 0.5, maxWidth: 760 }}>{descripcion}</Typography>}
          </Box>
          {cortes.length > 0 && (
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="caption" sx={{ color: t.text2 }}>Corte</Typography>
              <Select size="small" value={corte ?? cortes[0].id} onChange={(e) => setCorte(Number(e.target.value))}
                sx={{ bgcolor: t.paper, minWidth: 160, fontWeight: 600, '& fieldset': { borderColor: t.line } }}>
                {cortes.map((c) => <Opcion key={c.id} value={c.id}>{MESES[c.mes_corte - 1]} {c.anio}</Opcion>)}
              </Select>
            </Stack>
          )}
          {!SIN_FILTROS.includes(pathname) && cortes.length > 0 && (
            <Tooltip title="Descargar en Excel los agregados con los filtros actuales (sin datos personales)">
              <IconButton onClick={exportar} sx={{ border: `1px solid ${t.line}`, bgcolor: t.paper, borderRadius: '8px' }} aria-label="Exportar a Excel">
                <FileDownloadOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={modo === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton onClick={alternarModo} sx={{ border: `1px solid ${t.line}`, bgcolor: t.paper, borderRadius: '8px' }} aria-label="Cambiar tema">
              {modo === 'light' ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setMenu(e.currentTarget)} aria-label="Cuenta"
            sx={{ width: 36, height: 36, bgcolor: t.ink, color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: '50%',
              '&:hover': { bgcolor: t.unidad } }}>
            {usuario?.nombre?.[0]?.toUpperCase() ?? 'U'}
          </IconButton>
          <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" fontWeight={650}>{usuario?.nombre}</Typography>
              <Typography variant="caption">{usuario?.usuario}, rol {usuario?.rol}</Typography>
            </Box>
            <MenuItem onClick={salir}><ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>Cerrar sesión</MenuItem>
          </Menu>
        </Stack>
        {!SIN_FILTROS.includes(pathname) && cortes.length > 0 && <BarraFiltros />}
        <Box sx={{ px: { xs: 2, md: 3.5 }, py: 2.5, maxWidth: 1560 }}>{children}</Box>
      </Box>
    </Box>
  )
}
