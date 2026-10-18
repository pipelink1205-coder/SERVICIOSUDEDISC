import { Box, Typography } from '@mui/material'
import { Barras, Cargando, Cifra, Panel, useT } from '../components/base'
import { MapaCalor, Piramide, Proporcion } from '../components/Graficos'
import { Marco } from '../components/Marco'
import { type Conteo, useTablero } from '../lib/datos'
import { dec, num, oracion, pct, quitarDisc } from '../lib/formato'
import { SinCortes } from './SinCortes'

const aItems = (xs: Conteo[], etiqueta: (v: any) => string = oracion) =>
  xs.map((x) => ({ clave: x.valor, etiqueta: etiqueta(x.valor), atenciones: x.atenciones, personas: x.personas }))

export default function Personas() {
  const t = useT()
  const { data, isLoading, error } = useTablero()
  const desc = 'Perfil sociodemográfico. La pirámide cuenta personas distintas; las demás barras cuentan atenciones y muestran personas debajo.'
  if (error) return <Marco titulo="Personas"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Personas" descripcion={desc}><Cargando alto={600} /></Marco>
  const k = data.kpis
  const d = data.dimensiones
  const ms = data.matriz_discapacidad_sexo
  const columnasSexo = ['MUJER', 'HOMBRE', ...ms.columnas.filter((c) => !['MUJER', 'HOMBRE'].includes(c))].filter((c) => ms.columnas.includes(c))
  const reordenada = ms.valores.map((fila) => columnasSexo.map((c) => fila[ms.columnas.indexOf(c)]))

  return (
    <Marco titulo="Personas" descripcion={desc}>
      <Box sx={{ bgcolor: t.paper, border: `1px solid ${t.line}`, borderRadius: '12px', p: 2.25, display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, minmax(0,1fr))' }, gap: 2.5 }}>
        <Cifra etiqueta="Personas distintas" valor={num(k.personas)} sub={`${num(k.atenciones)} atenciones`} />
        <Cifra etiqueta="Edad promedio" valor={dec(k.edad_promedio)} sub={`mediana ${dec(k.edad_mediana, 0)} años`} />
        <Cifra etiqueta="Menores de 18" valor={num(k.menores_18)} sub={pct(k.menores_18, k.personas)} />
        <Cifra etiqueta="60 años o más" valor={num(k.mayores_60)} sub={pct(k.mayores_60, k.personas)} />
        <Cifra etiqueta="Marcados como nuevos" valor={num(k.nuevos)} sub={`${num(k.vienen)} marcados «viene»`}
          ayuda="Columnas NUEVO y VIENE del reporte (marca X). No se infieren desde la fecha de ingreso." />
        <Cifra etiqueta="Sin documento" valor={num(k.atenciones_sin_documento)} sub="atenciones sin persona identificada" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,5fr) minmax(0,7fr)' }, gap: 2, mt: 2 }}>
        <Panel titulo="Pirámide de edad"><Piramide datos={data.piramide} /></Panel>
        <Panel titulo="Discapacidad según sexo" ayuda="Atenciones. Clic en una fila o columna para filtrar.">
          <MapaCalor filas={ms.filas} columnas={columnasSexo} valores={reordenada} etiquetaFila={(f) => quitarDisc(f)}
            etiquetaColumna={(c) => oracion(c)} dimFila="discapacidad" dimColumna="sexo" anchoEtiqueta={170} />
        </Panel>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0,1fr))', xl: 'repeat(3, minmax(0,1fr))' }, gap: 2, mt: 2 }}>
        <Panel titulo="Sexo">
          <Proporcion partes={[
            { valor: k.mujeres.personas, color: t.mujeres, nombre: 'Mujeres' },
            { valor: k.hombres.personas, color: t.hombres, nombre: 'Hombres' },
            { valor: k.otro_sexo.personas, color: t.otro, nombre: 'Otro' },
          ]} />
          <Box mt={2}><Barras dim="sexo" items={aItems(d.sexo)} ancho={110} /></Box>
        </Panel>
        <Panel titulo="Área de residencia">
          <Proporcion partes={[
            { valor: k.urbana.personas, color: t.unidad, nombre: 'Urbana' },
            { valor: k.rural.personas, color: t.seq[5], nombre: 'Rural' },
          ]} />
          <Typography variant="caption" component="p" sx={{ mt: 1.5 }}>Porcentaje sobre personas distintas.</Typography>
          <Box mt={1.5}><Barras dim="area" items={aItems(d.area)} ancho={110} /></Box>
        </Panel>
        <Panel titulo="Rango de edad"><Barras dim="edad" items={aItems(d.rango_edad, (v) => `${v} años`)} ancho={110} max={6} /></Panel>
        <Panel titulo="Escolaridad"><Barras dim="escolaridad" items={aItems(d.escolaridad)} ancho={160} /></Panel>
        <Panel titulo="Estrato socioeconómico"><Barras dim="estrato" items={aItems(d.estrato)} ancho={160} /></Panel>
        <Panel titulo="Régimen de salud"><Barras dim="salud" items={aItems(d.salud)} ancho={130} /></Panel>
        <Panel titulo="Etnia"><Barras dim="etnia" items={aItems(d.etnia)} ancho={170} /></Panel>
        <Panel titulo="País de nacimiento"><Barras dim="pais" items={aItems(d.pais)} ancho={120} /></Panel>
        <Panel titulo="Tipo de documento"><Barras items={aItems(d.tipo_doc)} ancho={180} /></Panel>
        <Panel titulo="Campesino"><Barras items={aItems(d.campesino)} ancho={110} /></Panel>
        <Panel titulo="Habitanza en calle"><Barras items={aItems(d.habitanza)} ancho={170} /></Panel>
      </Box>
    </Marco>
  )
}
