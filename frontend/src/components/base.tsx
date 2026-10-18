import { Box, ButtonBase, Skeleton, Stack, Tooltip, Typography, useTheme } from '@mui/material'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import { useState, type ReactNode } from 'react'
import { FUENTE_DISPLAY, tokens } from '../theme'
import { num, pct } from '../lib/formato'
import { activo, useFiltros } from '../store/filtros'

export const useT = () => tokens[useTheme().palette.mode]

/** Bloque de contenido con título, ayuda opcional y acciones. */
export function Panel({ titulo, ayuda, acciones, children, sx, pad = 2.25, id }: {
  titulo?: ReactNode; ayuda?: ReactNode; acciones?: ReactNode; children: ReactNode; sx?: any; pad?: number; id?: string
}) {
  const t = useT()
  return (
    <Box component="section" id={id} sx={{ bgcolor: t.paper, border: `1px solid ${t.line}`, borderRadius: '12px',
      p: pad, minWidth: 0, display: 'flex', flexDirection: 'column', ...sx }}>
      {(titulo || acciones) && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} mb={1.75} sx={pad === 0 ? { px: 2.25, pt: 2.25, mb: 1 } : undefined}>
          <Box minWidth={0}>
            <Typography variant="h2" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {titulo}
              {ayuda && (
                <Tooltip title={ayuda} arrow>
                  <InfoOutlined sx={{ fontSize: 16, color: t.muted, cursor: 'help' }} />
                </Tooltip>
              )}
            </Typography>
          </Box>
          {acciones}
        </Stack>
      )}
      {children}
    </Box>
  )
}

/** Cifra con etiqueta. `grande` para las cifras de cabecera. */
export function Cifra({ etiqueta, valor, sub, color, grande, ayuda }: {
  etiqueta: ReactNode; valor: ReactNode; sub?: ReactNode; color?: string; grande?: boolean; ayuda?: string
}) {
  const t = useT()
  return (
    <Box minWidth={0}>
      <Typography variant="caption" sx={{ display: 'flex', gap: 0.5, alignItems: 'center', color: t.text2, fontWeight: 550 }}>
        {color && <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />}
        {etiqueta}
        {ayuda && (
          <Tooltip title={ayuda} arrow><InfoOutlined sx={{ fontSize: 14, color: t.muted, cursor: 'help' }} /></Tooltip>
        )}
      </Typography>
      <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '112%', lineHeight: 1.05,
        fontSize: grande ? { xs: '2.2rem', md: '2.75rem' } : '1.6rem', color: t.text, mt: 0.5, letterSpacing: '-0.02em' }}>
        {valor}
      </Typography>
      {sub && <Typography variant="caption" component="div" sx={{ mt: 0.5, color: t.text2 }}>{sub}</Typography>}
    </Box>
  )
}

export interface ItemBarra {
  clave: any
  etiqueta: string
  completo?: string
  atenciones: number
  personas?: number
  resaltar?: boolean
}

/**
 * Barras horizontales clicables. Un clic agrega o quita el valor del filtro global.
 * La longitud es atenciones; las personas van en texto secundario.
 */
export function Barras({ items, dim, max = 8, color, colorResalte, mostrarPersonas = true, total, ancho = 190 }: {
  items: ItemBarra[]; dim?: string; max?: number; color?: string; colorResalte?: string
  mostrarPersonas?: boolean; total?: number; ancho?: number
}) {
  const t = useT()
  const filtros = useFiltros((s) => s.filtros)
  const alternar = useFiltros((s) => s.alternar)
  const [todos, setTodos] = useState(false)
  if (!items.length) return <Vacio texto="Sin registros con los filtros actuales." />
  const visibles = todos ? items : items.slice(0, max)
  const tope = Math.max(...items.map((i) => i.atenciones), 1)
  const hayFiltro = dim ? (filtros[dim]?.length ?? 0) > 0 : false
  return (
    <Box>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {visibles.map((i) => {
          const on = dim ? activo(filtros, dim, i.clave) : false
          const c = i.resaltar ? (colorResalte ?? t.componente) : (color ?? t.unidad)
          const contenido = (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `${ancho}px 1fr auto` }, alignItems: 'center',
              columnGap: 1.5, rowGap: 0.25, py: 0.6, px: 0.75, borderRadius: '8px', width: '100%', textAlign: 'left',
              opacity: hayFiltro && !on ? 0.45 : 1,
              bgcolor: on ? t.unidadSuave : 'transparent', transition: 'background-color .15s',
              '&:hover': dim ? { bgcolor: on ? t.unidadSuave : t.bg } : undefined }}>
              <Typography variant="body2" title={i.completo ?? i.etiqueta}
                sx={{ color: t.text, fontWeight: i.resaltar || on ? 650 : 450, lineHeight: 1.25,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {i.etiqueta}
              </Typography>
              <Box sx={{ height: 10, borderRadius: '0 4px 4px 0', bgcolor: 'transparent', position: 'relative' }}>
                <Box sx={{ position: 'absolute', inset: 0, right: 'auto', width: `${Math.max((i.atenciones / tope) * 100, 0.8)}%`,
                  bgcolor: c, borderRadius: '0 4px 4px 0', transition: 'width .35s ease' }} />
              </Box>
              <Box sx={{ textAlign: 'right', minWidth: 84, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 650, color: t.text, lineHeight: 1.2 }}>{num(i.atenciones)}</Typography>
                {mostrarPersonas && i.personas != null && (
                  <Typography variant="caption" sx={{ color: t.muted, lineHeight: 1.1 }}>
                    {num(i.personas)} pers.{total ? `, ${pct(i.atenciones, total)}` : ''}
                  </Typography>
                )}
              </Box>
            </Box>
          )
          return (
            <li key={String(i.clave)}>
              {dim ? (
                <ButtonBase onClick={() => alternar(dim, i.clave)} sx={{ width: '100%', borderRadius: '8px', display: 'block' }}
                  aria-pressed={on} aria-label={`${i.etiqueta}: ${num(i.atenciones)} atenciones. ${on ? 'Quitar' : 'Agregar'} filtro`}>
                  {contenido}
                </ButtonBase>
              ) : contenido}
            </li>
          )
        })}
      </Box>
      {items.length > max && (
        <ButtonBase onClick={() => setTodos(!todos)} sx={{ mt: 1, px: 0.75, py: 0.5, borderRadius: '6px', color: 'primary.main',
          fontSize: '0.8125rem', fontWeight: 600 }}>
          {todos ? 'Ver menos' : `Ver los ${items.length}`}
        </ButtonBase>
      )}
    </Box>
  )
}

export function Vacio({ texto, accion }: { texto: string; accion?: ReactNode }) {
  const t = useT()
  return (
    <Box sx={{ py: 4, textAlign: 'center', color: t.text2 }}>
      <Typography variant="body2">{texto}</Typography>
      {accion && <Box mt={1.5}>{accion}</Box>}
    </Box>
  )
}

export function Cargando({ alto = 320 }: { alto?: number }) {
  return <Skeleton variant="rounded" height={alto} sx={{ borderRadius: '12px' }} />
}

/** Leyenda simple de series. */
export function Leyenda({ items }: { items: { color: string; texto: string; forma?: 'barra' | 'linea' }[] }) {
  const t = useT()
  return (
    <Stack direction="row" gap={2} flexWrap="wrap">
      {items.map((i) => (
        <Stack key={i.texto} direction="row" gap={0.75} alignItems="center">
          <Box sx={i.forma === 'linea'
            ? { width: 16, height: 2, bgcolor: i.color, borderRadius: 1 }
            : { width: 10, height: 10, bgcolor: i.color, borderRadius: '2px' }} />
          <Typography variant="caption" sx={{ color: t.text2 }}>{i.texto}</Typography>
        </Stack>
      ))}
    </Stack>
  )
}
