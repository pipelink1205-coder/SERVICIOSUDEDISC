import { Alert, Box } from '@mui/material'
import { Barras, Cargando, Cifra, Panel, useT } from '../components/base'
import { MapaTerritorio } from '../components/Mapa'
import { Marco } from '../components/Marco'
import { useVulnerabilidad } from '../lib/datos'
import { num, oracion, pct, quitarDisc, servicioCorto } from '../lib/formato'
import { SinCortes } from './SinCortes'

export default function Vulnerabilidad() {
  const t = useT()
  const { data, isLoading, error } = useVulnerabilidad()
  const desc = 'Condición de víctima y habitanza en calle. Solo visible para administradores; cada consulta queda en la auditoría.'
  if (error) return <Marco titulo="Vulnerabilidad"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Vulnerabilidad" descripcion={desc}><Cargando alto={600} /></Marco>
  const v = data.victimas
  return (
    <Marco titulo="Vulnerabilidad" descripcion={desc}>
      <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderColor: t.aviso, bgcolor: t.paper }}>
        Información sensible. No la incluyas en presentaciones generales ni en exportaciones fuera del equipo autorizado.
      </Alert>
      <Box sx={{ bgcolor: t.paper, border: `1px solid ${t.line}`, borderRadius: '12px', p: 2.25, display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0,1fr))' }, gap: 2.5 }}>
        <Cifra etiqueta="Personas víctimas" valor={num(v.personas)} sub={`${pct(v.personas, data.personas)} de las personas`} />
        <Cifra etiqueta="Atenciones a víctimas" valor={num(v.atenciones)} sub={`${pct(v.atenciones, data.atenciones)} de las atenciones`} />
        <Cifra etiqueta="Hecho más frecuente" valor={data.hecho[0] ? oracion(data.hecho[0].valor) : '—'}
          sub={data.hecho[0] ? `${num(data.hecho[0].personas)} personas` : ''} />
        <Cifra etiqueta="Registros SIN DATO" valor={num(data.sin_dato)} sub="no se cuentan como víctimas" />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,6fr) minmax(0,6fr)' }, gap: 2, mt: 2 }}>
        <Panel titulo="Hecho victimizante">
          <Barras dim="victima" max={15} ancho={220} color={t.critico}
            items={data.hecho.map((x: any) => ({ clave: x.valor, etiqueta: oracion(x.valor), atenciones: x.atenciones, personas: x.personas }))} />
        </Panel>
        <Panel titulo="Dónde viven las personas víctimas"><MapaTerritorio territorios={data.territorio.territorios} alto={420} totales={data.victimas} /></Panel>
        <Panel titulo="Víctimas por tipo de discapacidad">
          <Barras dim="discapacidad" ancho={140}
            items={data.discapacidad.map((x: any) => ({ clave: x.valor, etiqueta: quitarDisc(x.valor), atenciones: x.atenciones, personas: x.personas }))} />
        </Panel>
        <Panel titulo="Servicios que reciben">
          <Barras dim="servicio" ancho={200}
            items={data.servicio.map((x: any) => ({ clave: x.valor, etiqueta: servicioCorto(x.valor), atenciones: x.atenciones, personas: x.personas }))} />
        </Panel>
        <Panel titulo="Habitanza en calle o riesgo">
          <Barras ancho={200} items={data.habitanza.map((x: any) => ({ clave: x.valor, etiqueta: oracion(x.valor), atenciones: x.atenciones, personas: x.personas }))} />
        </Panel>
      </Box>
    </Marco>
  )
}
