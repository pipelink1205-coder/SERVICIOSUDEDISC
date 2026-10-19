import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { MES_CORTO, MESES, num, pct } from '../lib/formato'
import { activo, useFiltros } from '../store/filtros'
import { Leyenda, useT } from './base'

type PuntoMes = { mes: number } & Record<string, any>

function CajaTooltip({ active, payload, label, series }: any) {
  const t = useT()
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: t.ink, color: '#fff', borderRadius: '8px', px: 1.25, py: 1, fontSize: 12, minWidth: 150 }}>
      <Box sx={{ fontWeight: 700, mb: 0.5 }}>{MESES[label - 1]}</Box>
      {series.map((s: any) => {
        const p = payload.find((x: any) => x.dataKey === s.clave)
        return (
          <Stack key={s.clave} direction="row" justifyContent="space-between" gap={2}>
            <Stack direction="row" gap={0.75} alignItems="center">
              <Box sx={{ width: 8, height: s.tipo === 'linea' ? 2 : 8, bgcolor: s.color, borderRadius: '2px' }} />
              {s.nombre}
            </Stack>
            <strong>{num(p?.value ?? 0)}</strong>
          </Stack>
        )
      })}
    </Box>
  )
}

/**
 * Serie de enero a diciembre. Barras para atenciones (o apiladas), línea para personas.
 * Todas las series son conteos en el mismo eje. Clic en un mes = filtro.
 */
export function SerieMensual({ datos, series, alto = 260, apilar = false }: {
  datos: PuntoMes[]
  series: { clave: string; nombre: string; color: string; tipo: 'barra' | 'linea' }[]
  alto?: number; apilar?: boolean
}) {
  const t = useT()
  const filtros = useFiltros((s) => s.filtros)
  const alternar = useFiltros((s) => s.alternar)
  const sel = filtros.mes ?? []
  return (
    <Box>
      <Box mb={1}><Leyenda items={series.map((s) => ({ color: s.color, texto: s.nombre, forma: s.tipo }))} /></Box>
      <Box sx={{ height: alto, '& .recharts-surface': { overflow: 'visible' } }}>
        <ResponsiveContainer>
          <ComposedChart data={datos} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%"
            onClick={(e: any) => e?.activeLabel && alternar('mes', e.activeLabel)} style={{ cursor: 'pointer' }}>
            <CartesianGrid vertical={false} stroke={t.line} />
            <XAxis dataKey="mes" tickFormatter={(m) => MES_CORTO[m - 1]} tick={{ fontSize: 12, fill: t.text2 }}
              axisLine={{ stroke: t.line }} tickLine={false} />
            <YAxis tickFormatter={(v) => num(v)} tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} width={56} />
            <RTooltip content={<CajaTooltip series={series} />} cursor={{ fill: t.unidadSuave, opacity: 0.5 }} />
            {series.filter((s) => s.tipo === 'barra').map((s, i, arr) => (
              <Bar key={s.clave} dataKey={s.clave} fill={s.color} stackId={apilar ? 'a' : undefined}
                radius={!apilar || i === arr.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={38}
                stroke={apilar ? t.paper : undefined} strokeWidth={apilar ? 1 : 0}
                shape={(p: any) => {
                  const atenuado = sel.length > 0 && !sel.includes(String(p.payload.mes))
                  const r = !apilar || i === arr.length - 1 ? 4 : 0
                  const { x, y, width: w, height: h } = p
                  if (!h || h <= 0) return <g />
                  const rr = Math.min(r, h)
                  return <path d={`M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`}
                    fill={s.color} opacity={atenuado ? 0.3 : 1} />
                }} />
            ))}
            {series.filter((s) => s.tipo === 'linea').map((s) => (
              <Line key={s.clave} dataKey={s.clave} stroke={s.color} strokeWidth={2} type="monotone"
                dot={{ r: 3.5, fill: s.color, stroke: t.paper, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}

/** Pirámide de personas por rango de edad y sexo (HTML, barras espejadas). */
export function Piramide({ datos }: { datos: { rango: string; hombres: number; mujeres: number; otro: number }[] }) {
  const t = useT()
  const filtros = useFiltros((s) => s.filtros)
  const alternar = useFiltros((s) => s.alternar)
  const tope = Math.max(...datos.flatMap((d) => [d.hombres, d.mujeres]), 1)
  const filas = [...datos].reverse()
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Leyenda items={[{ color: t.hombres, texto: 'Hombres' }]} />
        <Leyenda items={[{ color: t.mujeres, texto: 'Mujeres' }]} />
      </Stack>
      {filas.map((d) => {
        const on = activo(filtros, 'edad', d.rango)
        return (
          <ButtonBase key={d.rango} onClick={() => alternar('edad', d.rango)} aria-pressed={on}
            sx={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px 1fr 52px', alignItems: 'center', width: '100%',
              gap: 0.75, py: 0.6, borderRadius: '6px', bgcolor: on ? t.unidadSuave : 'transparent',
              opacity: (filtros.edad?.length ?? 0) > 0 && !on ? 0.45 : 1 }}>
            <Typography variant="caption" sx={{ textAlign: 'right', color: t.text2 }}>{num(d.hombres)}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ height: 16, width: `${(d.hombres / tope) * 100}%`, bgcolor: t.hombres, borderRadius: '4px 0 0 4px' }} />
            </Box>
            <Typography variant="caption" sx={{ textAlign: 'center', fontWeight: 650, color: t.text }}>{d.rango}</Typography>
            <Box>
              <Box sx={{ height: 16, width: `${(d.mujeres / tope) * 100}%`, bgcolor: t.mujeres, borderRadius: '0 4px 4px 0' }} />
            </Box>
            <Typography variant="caption" sx={{ color: t.text2 }}>{num(d.mujeres)}</Typography>
          </ButtonBase>
        )
      })}
      <Typography variant="caption" component="p" sx={{ mt: 1, color: t.muted }}>
        Personas distintas según la edad al ingreso. Clic en un rango para filtrar.
      </Typography>
    </Box>
  )
}

/** Luminancia relativa aproximada de un color hex. */
const luz = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

/** Mapa de calor con escala secuencial de un solo tono. */
export function MapaCalor({ filas, columnas, valores, etiquetaFila, etiquetaColumna, dimFila, dimColumna, claveFila,
  anchoEtiqueta = 180, rampa }: {
  filas: any[]; columnas: any[]; valores: number[][]; etiquetaFila: (f: any) => string; etiquetaColumna: (c: any) => string
  dimFila?: string; dimColumna?: string; claveFila?: (f: any) => any; anchoEtiqueta?: number; rampa?: string[]
}) {
  const t = useT()
  const alternar = useFiltros((s) => s.alternar)
  const filtros = useFiltros((s) => s.filtros)
  const escala = rampa ?? t.seq
  // filas y columnas seleccionadas en el filtro global: se resaltan y el resto se apaga
  const selCol = dimColumna ? filtros[dimColumna] ?? [] : []
  const selFila = dimFila ? filtros[dimFila] ?? [] : []
  const colOn = (c: any) => !selCol.length || selCol.includes(String(c))
  const clave = (f: any) => String(claveFila ? claveFila(f) : f)
  const filaOn = (f: any) => !selFila.length || selFila.includes(clave(f))
  // la escala de color se calcula solo con lo seleccionado, para que el contraste sea útil
  const tope = Math.max(...valores.flatMap((fila, i) => (filaOn(filas[i]) ? fila.filter((_, j) => colOn(columnas[j])) : [])), 1)
  const indice = (v: number) => Math.min(escala.length - 1, Math.floor(Math.sqrt(Math.min(v / tope, 1)) * (escala.length - 0.01)))
  const totalFila = (i: number) => valores[i].reduce((a, v, j) => a + (colOn(columnas[j]) ? v : 0), 0)
  const hayFiltro = selCol.length > 0 || selFila.length > 0
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `${anchoEtiqueta}px repeat(${columnas.length}, minmax(44px, 1fr)) 70px`,
        gap: '2px', minWidth: anchoEtiqueta + columnas.length * 46 + 72 }}>
        <Box />
        {columnas.map((c) => {
          const on = selCol.includes(String(c))
          return (
            <ButtonBase key={String(c)} disabled={!dimColumna} onClick={() => dimColumna && alternar(dimColumna, c)} aria-pressed={on}
              sx={{ fontSize: 11, color: on ? t.unidad : t.text2, fontWeight: on ? 800 : 600, py: 0.5, borderRadius: '4px',
                borderBottom: on ? `2px solid ${t.unidad}` : '2px solid transparent', opacity: colOn(c) ? 1 : 0.5 }}>
              {etiquetaColumna(c)}
            </ButtonBase>
          )
        })}
        <Box sx={{ fontSize: 11, color: t.text, fontWeight: 700, py: 0.5, textAlign: 'right', pr: 0.75 }}>
          {selCol.length ? 'Total sel.' : 'Total'}
        </Box>
        {filas.map((f, i) => i)
          .sort((x, y) => (selCol.length ? totalFila(y) - totalFila(x) : 0) || x - y)
          .map((i) => {
          const f = filas[i]
          const fOn = filaOn(f)
          const tot = totalFila(i)
          return (
            <Box key={String(f)} sx={{ display: 'contents' }}>
              <ButtonBase disabled={!dimFila} onClick={() => dimFila && alternar(dimFila, claveFila ? claveFila(f) : f)}
                sx={{ justifyContent: 'flex-start', fontSize: 12, color: t.text, pr: 1, textAlign: 'left', borderRadius: '4px',
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', lineHeight: '28px',
                  fontWeight: selFila.includes(clave(f)) ? 700 : 400, opacity: fOn ? 1 : 0.45 }}
                title={etiquetaFila(f)}>
                {etiquetaFila(f)}
              </ButtonBase>
              {valores[i].map((v, j) => {
                const on = fOn && colOn(columnas[j])
                return (
                  <Tooltip key={j} arrow title={`${etiquetaFila(f)}, ${etiquetaColumna(columnas[j])}: ${num(v)} atenciones`}>
                    <Box sx={{ height: 28, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10.5, fontWeight: 600, transition: 'opacity .2s',
                      bgcolor: v ? (on ? escala[indice(v)] : t.line) : t.bg,
                      opacity: on || !hayFiltro ? 1 : 0.55,
                      color: !v ? t.text2 : on ? (luz(escala[indice(v)]) < 0.45 ? '#fff' : '#172033') : t.muted }}>
                      {v ? num(v) : ''}
                    </Box>
                  </Tooltip>
                )
              })}
              <Box sx={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 0.75, fontSize: 11.5,
                fontWeight: 700, color: fOn && tot ? t.text : t.muted }}>
                {tot ? num(tot) : '—'}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

/** Barra de proporción (parte de un todo) con dos o tres segmentos. */
export function Proporcion({ partes, alto = 12 }: { partes: { valor: number; color: string; nombre: string }[]; alto?: number }) {
  const t = useT()
  const total = partes.reduce((a, b) => a + b.valor, 0) || 1
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: '2px', height: alto, borderRadius: '6px', overflow: 'hidden' }}>
        {partes.filter((p) => p.valor > 0).map((p) => (
          <Tooltip key={p.nombre} title={`${p.nombre}: ${num(p.valor)} (${pct(p.valor, total)})`} arrow>
            <Box sx={{ flex: `${p.valor} 0 0`, bgcolor: p.color, minWidth: 3 }} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" gap={2} mt={0.75} flexWrap="wrap">
        {partes.map((p) => (
          <Typography key={p.nombre} variant="caption" sx={{ color: t.text2, display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
            <Box component="span" sx={{ width: 8, height: 8, bgcolor: p.color, borderRadius: '2px' }} />
            {p.nombre} <strong style={{ color: t.text }}>{pct(p.valor, total)}</strong>
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}

/** Mini serie de 12 meses para tablas. */
export function Chispa({ valores, color, alto = 22, ancho = 96 }: { valores: number[]; color: string; alto?: number; ancho?: number }) {
  const tope = Math.max(...valores, 1)
  const w = ancho / valores.length
  return (
    <svg width={ancho} height={alto} role="img" aria-label="Atenciones por mes">
      {valores.map((v, i) => (
        <rect key={i} x={i * w + 1} y={alto - (v / tope) * alto} width={Math.max(w - 2, 1)} height={(v / tope) * alto || 0}
          rx={1.5} fill={color} opacity={v ? 1 : 0} />
      ))}
    </svg>
  )
}
