import { Fragment } from 'react'
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Cargando, Panel, useT } from '../components/base'
import { Chispa, MapaCalor } from '../components/Graficos'
import { Marco } from '../components/Marco'
import { useTablero } from '../lib/datos'
import { dec, MES_CORTO, num, pct, servicioCorto } from '../lib/formato'
import { activo, useFiltros } from '../store/filtros'
import { FUENTE_DISPLAY } from '../theme'
import { SinCortes } from './SinCortes'

export default function Servicios() {
  const t = useT()
  const { data, isLoading, error } = useTablero()
  const filtros = useFiltros((s) => s.filtros)
  const alternar = useFiltros((s) => s.alternar)
  const desc = 'Todos los bienes, productos y servicios reportados, agrupados por indicador de producto. Clic en una fila para filtrar.'
  if (error) return <Marco titulo="Servicios"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Servicios" descripcion={desc}><Cargando alto={600} /></Marco>

  const d = data.dimensiones
  const total = data.kpis.atenciones
  const m = data.matriz_servicio_mes
  const meses = Array.from({ length: 12 }, (_, i) => i + 1)
  const porMes = (s: string) => {
    const i = m.filas.indexOf(s)
    return meses.map((mm) => { const j = m.columnas.indexOf(mm); return i >= 0 && j >= 0 ? m.valores[i][j] : 0 })
  }
  const grupos = d.indicador_cod.map((ind) => ({ ind, servicios: d.servicio.filter((s) => s.indicador === ind.valor) }))

  return (
    <Marco titulo="Servicios" descripcion={desc}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.max(d.indicador_cod.length, 1)}, minmax(0,1fr))` }, gap: 2, mb: 2 }}>
        {d.indicador_cod.map((i) => {
          const on = activo(filtros, 'indicador', i.valor)
          return (
            <Box key={i.valor} component="button" onClick={() => alternar('indicador', i.valor)} aria-pressed={on}
              sx={{ all: 'unset', cursor: 'pointer', bgcolor: on ? t.unidadSuave : t.paper, border: `1px solid ${on ? t.unidad : t.line}`,
                borderRadius: '12px', p: 2.25, '&:focus-visible': { outline: `2px solid ${t.unidad}` } }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: t.unidad }}>Indicador {i.valor}</Typography>
              <Typography variant="body2" sx={{ color: t.text, mt: 0.5, lineHeight: 1.4, minHeight: 54 }}>{i.nombre}</Typography>
              <Stack direction="row" gap={3} mt={1.5}>
                <Box>
                  <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '112%', fontSize: 26, lineHeight: 1 }}>{num(i.atenciones)}</Typography>
                  <Typography variant="caption">atenciones, {pct(i.atenciones, total, 0)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '112%', fontSize: 26, lineHeight: 1 }}>{num(i.personas)}</Typography>
                  <Typography variant="caption">personas</Typography>
                </Box>
              </Stack>
            </Box>
          )
        })}
      </Box>

      <Panel titulo="Catálogo de servicios del corte" pad={0} sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2.25 }}>Servicio</TableCell>
                <TableCell align="right">Atenciones</TableCell>
                <TableCell align="right">Personas</TableCell>
                <TableCell align="right">Meses con reporte</TableCell>
                <TableCell align="right">Del total</TableCell>
                <TableCell sx={{ pr: 2.25 }}>Enero a diciembre</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.map(({ ind, servicios }) => (
                <Fragment key={ind.valor}>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ bgcolor: t.bg, pl: 2.25, py: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{ind.valor}
                        <Typography component="span" variant="body2" sx={{ color: t.text2, fontWeight: 400, ml: 1 }}>{ind.nombre}</Typography>
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {servicios.map((s) => {
                    const on = activo(filtros, 'servicio', s.valor)
                    return (
                      <TableRow key={s.valor} hover onClick={() => alternar('servicio', s.valor)} selected={on}
                        sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: t.unidadSuave } }}>
                        <TableCell sx={{ pl: 2.25, maxWidth: 420 }}>
                          <Stack direction="row" gap={1} alignItems="center">
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{servicioCorto(s.valor)}</Typography>
                              <Typography variant="caption" sx={{ color: t.muted, display: 'block', lineHeight: 1.3 }}>
                                {s.valor}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 650 }}>{num(s.atenciones)}</TableCell>
                        <TableCell align="right">{num(s.personas)}</TableCell>
                        <TableCell align="right">{porMes(s.valor).filter(Boolean).length}</TableCell>
                        <TableCell align="right">{pct(s.atenciones, total)}</TableCell>
                        <TableCell sx={{ pr: 2.25 }}><Chispa valores={porMes(s.valor)} color={t.unidad} /></TableCell>
                      </TableRow>
                    )
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Panel>

      <Panel titulo="Servicio por mes" ayuda="Intensidad = atenciones del servicio en el mes. Clic en un nombre o un mes para filtrar." sx={{ mt: 2 }}>
        <MapaCalor filas={m.filas} columnas={m.columnas} valores={m.valores} etiquetaFila={(f) => servicioCorto(f)}
          etiquetaColumna={(c) => MES_CORTO[c - 1] ?? String(c)} dimFila="servicio" dimColumna="mes" anchoEtiqueta={260} />
      </Panel>
    </Marco>
  )
}
