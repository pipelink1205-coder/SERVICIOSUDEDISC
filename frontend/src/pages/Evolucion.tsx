import { Box, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Cargando, Cifra, Panel, Vacio, useT } from '../components/base'
import { SerieMensual } from '../components/Graficos'
import { Marco } from '../components/Marco'
import { useComparar, useCortes, useTablero } from '../lib/datos'
import { MESES, num, servicioCorto } from '../lib/formato'
import { SinCortes } from './SinCortes'

function Delta({ v }: { v: number }) {
  const t = useT()
  if (!v) return <span style={{ color: t.muted }}>0</span>
  return <span style={{ color: v > 0 ? t.text : t.critico, fontWeight: 650 }}>{v > 0 ? '+' : '−'}{num(Math.abs(v))}</span>
}

export default function Evolucion() {
  const t = useT()
  const { data, isLoading, error } = useTablero()
  const { data: cortes } = useCortes()
  const lista = cortes?.cortes ?? []
  const [a, setA] = useState<number>()
  const [b, setB] = useState<number>()
  useEffect(() => {
    if (lista.length >= 2 && !a && !b) { setB(lista[0].id); setA(lista[1].id) }
  }, [lista, a, b])
  const { data: cmp, isLoading: cargandoCmp } = useComparar(a, b)
  const desc = 'Cómo se mueve el año mes a mes, y qué cambió entre un corte y otro.'
  if (error) return <Marco titulo="Evolución"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Evolución" descripcion={desc}><Cargando alto={600} /></Marco>

  let acumulado = 0
  const serie = data.serie.map((s) => { acumulado += s.personas_primera_vez; return { ...s, acumulado } })
  const conDatos = data.serie.filter((s) => s.atenciones)
  const pico = conDatos.reduce((x, y) => (y.atenciones > x.atenciones ? y : x), conDatos[0] ?? data.serie[0])

  return (
    <Marco titulo="Evolución" descripcion={desc}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,9fr) minmax(0,3fr)' }, gap: 2 }}>
        <Panel titulo="Atenciones, personas y personas nuevas en el año"
          ayuda="«Por primera vez»: personas que no habían aparecido en ningún mes anterior de este corte.">
          <SerieMensual alto={300} datos={serie} series={[
            { clave: 'atenciones', nombre: 'Atenciones', color: t.unidad, tipo: 'barra' },
            { clave: 'personas_primera_vez', nombre: 'Personas por primera vez', color: t.seq[2], tipo: 'barra' },
            { clave: 'personas', nombre: 'Personas en el mes', color: t.personas, tipo: 'linea' },
          ]} />
        </Panel>
        <Panel titulo="Lectura rápida">
          <Stack gap={2.5}>
            <Cifra etiqueta="Mes con más atenciones" valor={pico ? MESES[pico.mes - 1] : '—'} sub={pico ? `${num(pico.atenciones)} atenciones` : ''} />
            <Cifra etiqueta="Meses con reporte" valor={`${conDatos.length} de 12`}
              sub={data.serie.filter((s) => !s.atenciones).map((s) => s.nombre).join(', ') ? `Sin reporte: ${data.serie.filter((s) => !s.atenciones).map((s) => s.nombre.toLowerCase()).join(', ')}` : 'Todos los meses reportan'} />
            <Cifra etiqueta="Personas alcanzadas en el año" valor={num(acumulado)} sub="suma de personas por primera vez" />
          </Stack>
        </Panel>
      </Box>

      <Panel titulo="Personas alcanzadas, acumulado del año" sx={{ mt: 2 }}>
        <SerieMensual alto={220} datos={serie} series={[{ clave: 'acumulado', nombre: 'Personas acumuladas', color: t.unidad, tipo: 'linea' }]} />
      </Panel>

      <Panel titulo="Comparar dos cortes" sx={{ mt: 2 }} ayuda="Cada archivo mensual es acumulado. Comparar dos cortes muestra qué se agregó o corrigió entre una entrega y otra."
        acciones={lista.length >= 2 ? (
          <Stack direction="row" gap={1} alignItems="center">
            <Select size="small" value={a ?? ''} onChange={(e) => setA(Number(e.target.value))}>
              {lista.map((c) => <MenuItem key={c.id} value={c.id}>{c.etiqueta}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: t.text2 }}>contra</Typography>
            <Select size="small" value={b ?? ''} onChange={(e) => setB(Number(e.target.value))}>
              {lista.map((c) => <MenuItem key={c.id} value={c.id}>{c.etiqueta}</MenuItem>)}
            </Select>
          </Stack>) : undefined}>
        {lista.length < 2 ? (
          <Vacio texto="Hace falta al menos un segundo corte. Cuando cargues el reporte del siguiente mes, aquí verás qué cambió mes por mes y servicio por servicio." />
        ) : a === b ? <Vacio texto="Elige dos cortes distintos." /> : cargandoCmp || !cmp ? <Cargando alto={240} /> : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 2.5 }}>
              <Cifra etiqueta={`Atenciones ${cmp.a.etiqueta}`} valor={num(cmp.totales.a.atenciones)} />
              <Cifra etiqueta={`Atenciones ${cmp.b.etiqueta}`} valor={num(cmp.totales.b.atenciones)}
                sub={<Delta v={cmp.totales.b.atenciones - cmp.totales.a.atenciones} />} />
              <Cifra etiqueta="Personas nuevas en el segundo corte" valor={num(cmp.personas_solo_b)} />
              <Cifra etiqueta="Personas que ya no aparecen" valor={num(cmp.personas_solo_a)} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 3 }}>
              <TablaDelta titulo="Por mes" filas={cmp.mes} etiqueta={(v) => MESES[v - 1]} />
              <TablaDelta titulo="Por servicio" filas={cmp.servicio} etiqueta={servicioCorto} />
            </Box>
          </>
        )}
      </Panel>
    </Marco>
  )
}

function TablaDelta({ titulo, filas, etiqueta }: { titulo: string; filas: any[]; etiqueta: (v: any) => string }) {
  return (
    <Box>
      <Typography variant="h3" mb={1}>{titulo}</Typography>
      <Table size="small">
        <TableHead><TableRow><TableCell /><TableCell align="right">Antes</TableCell><TableCell align="right">Después</TableCell><TableCell align="right">Cambio</TableCell></TableRow></TableHead>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={String(f.valor)}>
              <TableCell>{etiqueta(f.valor)}</TableCell>
              <TableCell align="right">{num(f.a)}</TableCell>
              <TableCell align="right">{num(f.b)}</TableCell>
              <TableCell align="right"><Delta v={f.delta} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}
