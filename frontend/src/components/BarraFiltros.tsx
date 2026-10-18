import { Box, Button, Checkbox, Chip, InputAdornment, List, ListItemButton, Popover, Stack, TextField, Typography } from '@mui/material'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { useMemo, useState } from 'react'
import { useOpciones, useTablero } from '../lib/datos'
import { DIMENSIONES, ORDEN_FILTROS } from '../lib/dimensiones'
import { num } from '../lib/formato'
import { useFiltros } from '../store/filtros'
import { puede, useSesion } from '../store/sesion'
import { useT } from './base'

export function BarraFiltros() {
  const t = useT()
  const { filtros, alternar, quitar, limpiar } = useFiltros()
  const { data: op } = useOpciones()
  const { data: tab, isFetching } = useTablero()
  const usuario = useSesion((s) => s.usuario)
  const [ancla, setAncla] = useState<HTMLElement | null>(null)
  const [dim, setDim] = useState('mes')
  const [buscar, setBuscar] = useState('')

  const opciones = op?.opciones ?? {}
  const dims = ORDEN_FILTROS.filter((d) => opciones[d] && (!DIMENSIONES[d].sensible || puede(usuario, 'admin')))
  const extra = (d: string, v: string) => opciones[d]?.find((o) => String(o.valor) === v)
  const valores = useMemo(() => {
    const lista = opciones[dim] ?? []
    const b = buscar.trim().toLowerCase()
    return b ? lista.filter((o) => DIMENSIONES[dim].etiqueta(o.valor, o).toLowerCase().includes(b)) : lista
  }, [opciones, dim, buscar])
  const chips = Object.entries(filtros).flatMap(([d, vs]) => vs.map((v) => ({ d, v })))

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: t.bg, borderBottom: `1px solid ${t.line}`, px: { xs: 2, md: 3.5 }, py: 1.25 }}>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<FilterListRounded />} onClick={(e) => setAncla(e.currentTarget)}
          sx={{ borderColor: t.line, color: t.text, bgcolor: t.paper, '&:hover': { borderColor: t.unidad, bgcolor: t.paper } }}>
          Filtrar
        </Button>
        {chips.length === 0 && (
          <Typography variant="body2" sx={{ color: t.text2 }}>
            Sin filtros. Haz clic en cualquier barra, mes o comuna para cruzar los datos.
          </Typography>
        )}
        {chips.map(({ d, v }) => (
          <Chip key={`${d}-${v}`} size="small" onDelete={() => quitar(d, v)}
            label={<span><span style={{ color: t.text2, fontWeight: 450 }}>{DIMENSIONES[d]?.nombre ?? d}: </span>
              {DIMENSIONES[d]?.etiqueta(v, extra(d, v)) ?? v}</span>}
            sx={{ bgcolor: t.unidadSuave, color: t.text, maxWidth: 360 }} />
        ))}
        {chips.length > 0 && (
          <Button size="small" onClick={limpiar} sx={{ color: t.text2 }}>Quitar filtros</Button>
        )}
        <Box flex={1} />
        {tab && (
          <Typography variant="body2" sx={{ color: t.text2, opacity: isFetching ? 0.5 : 1, transition: 'opacity .2s' }}>
            {chips.length > 0
              ? <><strong style={{ color: t.text }}>{num(tab.kpis.atenciones)}</strong> de {num(tab.universo.atenciones)} atenciones, <strong style={{ color: t.text }}>{num(tab.kpis.personas)}</strong> personas</>
              : <>{num(tab.universo.atenciones)} atenciones, {num(tab.universo.personas)} personas</>}
          </Typography>
        )}
      </Stack>

      <Popover open={!!ancla} anchorEl={ancla} onClose={() => { setAncla(null); setBuscar('') }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} slotProps={{ paper: { sx: { mt: 1, borderRadius: '12px', border: `1px solid ${t.line}` } } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 340px' }, height: { sm: 420 } }}>
          <List dense sx={{ borderRight: { sm: `1px solid ${t.line}` }, overflowY: 'auto', py: 1 }}>
            {dims.map((d) => (
              <ListItemButton key={d} selected={d === dim} onClick={() => { setDim(d); setBuscar('') }}
                sx={{ borderRadius: '6px', mx: 1, justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: d === dim ? 650 : 450 }}>{DIMENSIONES[d].nombre}</Typography>
                {(filtros[d]?.length ?? 0) > 0 && (
                  <Box sx={{ fontSize: 11, fontWeight: 700, bgcolor: t.unidad, color: '#fff', borderRadius: '10px', px: 0.75 }}>
                    {filtros[d].length}
                  </Box>
                )}
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box p={1.25} pb={0.5}>
              <TextField size="small" fullWidth placeholder={`Buscar en ${DIMENSIONES[dim].nombre.toLowerCase()}`} value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
            </Box>
            <List dense sx={{ overflowY: 'auto', flex: 1, px: 0.5 }}>
              {valores.map((o) => {
                const v = String(o.valor)
                const on = (filtros[dim] ?? []).includes(v)
                return (
                  <ListItemButton key={v} onClick={() => alternar(dim, v)} sx={{ borderRadius: '6px', py: 0.25, gap: 1 }}>
                    <Checkbox size="small" checked={on} disableRipple sx={{ p: 0.5 }} />
                    <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.25 }}>{DIMENSIONES[dim].etiqueta(o.valor, o)}</Typography>
                    <Typography variant="caption" sx={{ color: t.muted }}>{num(o.n)}</Typography>
                  </ListItemButton>
                )
              })}
              {!valores.length && <Typography variant="body2" sx={{ p: 2, color: t.text2 }}>Ningún valor coincide.</Typography>}
            </List>
          </Box>
        </Box>
      </Popover>
    </Box>
  )
}
