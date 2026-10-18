import { Alert, Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useState } from 'react'
import { Barras, Cargando, Panel, useT } from '../components/base'
import { MapaCalor } from '../components/Graficos'
import { MapaTerritorio } from '../components/Mapa'
import { Marco } from '../components/Marco'
import { useTablero } from '../lib/datos'
import { MES_CORTO, num, oracion , etiquetaComuna } from '../lib/formato'
import { SinCortes } from './SinCortes'

export default function Territorio() {
  const t = useT()
  const { data, isLoading, error } = useTablero()
  const [medida, setMedida] = useState<'atenciones' | 'personas'>('atenciones')
  const desc = '16 comunas y 5 corregimientos de Medellín. Clic en un polígono o en una barra para filtrar todo el tablero.'
  if (error) return <Marco titulo="Territorio"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Territorio" descripcion={desc}><Cargando alto={600} /></Marco>
  const terr = data.territorio
  const todos = [...terr.territorios, ...terr.sin_mapa].sort((a, b) => b[medida] - a[medida])
  const m = data.matriz_mes_comuna
  const orden = [...m.filas].map((f, i) => ({ f, i })).sort((a, b) => {
    const na = parseInt(String(a.f)), nb = parseInt(String(b.f))
    return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb)
  })

  return (
    <Marco titulo="Territorio" descripcion={desc}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,8fr) minmax(0,4fr)' }, gap: 2 }}>
        <Panel titulo="Mapa de atenciones" acciones={
          <ToggleButtonGroup size="small" exclusive value={medida} onChange={(_, v) => v && setMedida(v)}>
            <ToggleButton value="atenciones" sx={{ px: 1.5 }}>Atenciones</ToggleButton>
            <ToggleButton value="personas" sx={{ px: 1.5 }}>Personas</ToggleButton>
          </ToggleButtonGroup>}>
          <MapaTerritorio territorios={terr.territorios} medida={medida} alto={600} totales={data.kpis} />
          {terr.sin_mapa.length > 0 && (
            <Alert severity="info" variant="outlined" sx={{ mt: 1.5, borderColor: t.line }}>
              Sin polígono en el mapa: {terr.sin_mapa.map((s) => `${etiquetaComuna(s.nombre)} (${num(s[medida])} ${medida})`).join(', ')}.
              Se cuentan en todos los totales y en la lista.
            </Alert>
          )}
        </Panel>
        <Panel titulo={`Ranking por ${medida}`}>
          <Box sx={{ maxHeight: 660, overflowY: 'auto', pr: 0.5 }}>
            <Barras dim="comuna" max={30} ancho={150}
              items={todos.map((x) => ({ clave: x.numero ?? x.nombre, etiqueta: etiquetaComuna(x.nombre), atenciones: x[medida],
                personas: medida === 'atenciones' ? x.personas : x.atenciones }))} mostrarPersonas={medida === 'atenciones'} />
          </Box>
        </Panel>
      </Box>

      <Panel titulo="Comuna por mes" ayuda="Atenciones de cada territorio en cada mes de reporte." sx={{ mt: 2 }}>
        <MapaCalor filas={orden.map((o) => o.f)} columnas={m.columnas} valores={orden.map((o) => m.valores[o.i])}
          etiquetaFila={(f) => etiquetaComuna(String(f))} etiquetaColumna={(c) => MES_CORTO[c - 1] ?? String(c)}
          dimFila="comuna" claveFila={(f) => parseInt(String(f))} dimColumna="mes" anchoEtiqueta={200} />
      </Panel>

      <Panel titulo="Barrios con más atenciones" ayuda="Los 25 barrios con más registros dentro del filtro activo." sx={{ mt: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: 4 }}>
          {[data.barrios.slice(0, 13), data.barrios.slice(13)].map((grupo, i) => (
            <Barras key={i} max={13} ancho={200} items={grupo.map((b) => ({ clave: b.valor, etiqueta: oracion(b.valor).replace(/\s*-\s*\d+$/, ''),
              completo: b.valor, atenciones: b.atenciones, personas: b.personas }))} />
          ))}
        </Box>
      </Panel>
    </Marco>
  )
}
