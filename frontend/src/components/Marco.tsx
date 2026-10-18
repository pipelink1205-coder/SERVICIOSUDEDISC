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

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const u = useSesion((s) => s.usuario)
  const ink = tokens.dark
  const item = (n: (typeof NAV)[number]) => (
    <Box component={NavLink} key={n.ruta} to={n.ruta} end={n.ruta === '/'} onClick={alNavegar}
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '8px', color: '#AEB8C9',
        textDecoration: 'none', fontSize: 14, fontWeight: 500, position: 'relative',
        '& svg': { fontSize: 20 },
        '&:hover': { bgcolor: 'rgba(255,255,255,.05)', color: '#fff' },
        '&.active': { bgcolor: 'rgba(57,135,229,.16)', color: '#fff', fontWeight: 650 },
        '&.active::before': { content: '""', position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: 2,
          bgcolor: '#3987e5' },
        '&.active svg': { color: '#6da7ec' } }}>
      {n.icono}{n.texto}
    </Box>
  )
  const visibles = NAV.filter((n) => puede(u, n.rol))
  return (
    <Box sx={{ width: 240, height: '100%', bgcolor: '#121A2B', color: '#fff', display: 'flex', flexDirection: 'column', px: 1.5, py: 2.5 }}>
      <Box sx={{ px: 1.5, mb: 3 }}>
        <Stack direction="row" gap={1.25} alignItems="center">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#1d2840" />
            <path d="M7 23V13l5 4 6-7 7 6v7z" fill="#3987e5" /><circle cx="22.5" cy="9.5" r="3" fill="#eb6834" /></svg>
          <Box>
            <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '115%', fontSize: 17, lineHeight: 1 }}>
              Analítica EPI
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#8C97AB', mt: 0.4 }}>Unidad de Discapacidad</Typography>
          </Box>
        </Stack>
      </Box>
      <Stack gap={0.25}>{visibles.filter((n) => n.grupo === 'tablero').map(item)}</Stack>
      {visibles.some((n) => n.grupo === 'datos') && (
        <>
          <Typography sx={{ fontSize: 12, color: '#6F7A8F', px: 1.5, mt: 3, mb: 0.75, fontWeight: 600 }}>Datos</Typography>
          <Stack gap={0.25}>{visibles.filter((n) => n.grupo === 'datos').map(item)}</Stack>
        </>
      )}
      <Box flex={1} />
      <Typography sx={{ fontSize: 11, color: '#6F7A8F', px: 1.5, lineHeight: 1.5 }}>
        Alcaldía de Medellín<br />Secretaría de Inclusión Social
      </Typography>
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
        <Drawer open={abierto} onClose={() => setAbierto(false)}><Navegacion alNavegar={() => setAbierto(false)} /></Drawer>
      ) : (
        <Box sx={{ width: 240, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}><Navegacion /></Box>
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
