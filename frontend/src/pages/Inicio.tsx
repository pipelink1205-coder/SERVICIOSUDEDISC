import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Barras, Cargando, Cifra, Panel, useT } from '../components/base'
import { Proporcion, SerieMensual } from '../components/Graficos'
import { MapaTerritorio, resumenZona, TarjetaZona } from '../components/Mapa'
import { Marco } from '../components/Marco'
import { useTablero } from '../lib/datos'
import { activo, useFiltros } from '../store/filtros'
import { dec, num, oracion, pct, quitarDisc, servicioCorto, etiquetaComuna, nombreComuna } from '../lib/formato'
import { FUENTE_DISPLAY } from '../theme'
import { SinCortes } from './SinCortes'

export default function Inicio() {
  const t = useT()
  const { data, isLoading, error } = useTablero()
  const filtros = useFiltros((s) => s.filtros)
  const alternar = useFiltros((s) => s.alternar)
  const quitar = useFiltros((s) => s.quitar)
  const [encima, setEncima] = useState<number | null>(null)
  if (error) return <Marco titulo="Inicio"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Inicio"><Cargando alto={520} /></Marco>

  const k = data.kpis
  const d = data.dimensiones
  const valoresZona = new Map(data.territorio.territorios.map((x) => [x.numero as number, x]))
  const nombresZona = new Map(data.territorio.territorios.map((x) => [x.numero as number, nombreComuna(x.nombre)]))

  return (
    <Marco titulo={`Seguimiento ${data.corte.anio}`}
      descripcion={<>Corte de {data.corte.etiqueta.toLowerCase()}. Una <strong>atención</strong> es una fila válida del reporte; una <strong>persona</strong> es un documento distinto.</>}>
      {/* Panel principal: totales y zona a la izquierda, mapa grande a la derecha */}
      <Box sx={{ bgcolor: '#121A2B', borderRadius: '14px', border: '1px solid', borderColor: (th) => th.palette.mode === 'dark' ? '#273046' : 'transparent',
        p: { xs: 2, md: 3 }, color: '#fff', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' }, gap: 3 }}>
        <Stack gap={3}>
          <Box>
            <Typography sx={{ fontSize: 13, color: '#8C97AB', fontWeight: 550 }}>Atenciones registradas</Typography>
            <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 750, fontStretch: '118%', fontSize: { xs: 52, md: 64 },
              lineHeight: 0.95, letterSpacing: '-0.03em', mt: 0.5 }}>{num(k.atenciones)}</Typography>
            <Typography sx={{ fontSize: 13, color: '#8C97AB', fontWeight: 550, mt: 2.5 }}>Personas distintas</Typography>
            <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '118%', fontSize: { xs: 38, md: 44 },
              lineHeight: 1, letterSpacing: '-0.02em', mt: 0.5, color: '#9ec5f4' }}>{num(k.personas)}</Typography>
            <Typography sx={{ fontSize: 13, color: '#AEB8C9', mt: 1.5, lineHeight: 1.5 }}>
              {dec(k.personas ? k.atenciones / k.personas : 0, 2)} atenciones por persona, en {k.meses_con_reporte} {k.meses_con_reporte === 1 ? 'mes' : 'meses'} con
              reporte, {k.servicios_activos} {k.servicios_activos === 1 ? 'servicio' : 'servicios'} y {k.territorios} {k.territorios === 1 ? 'territorio' : 'territorios'}.
            </Typography>
          </Box>
          <TarjetaZona enLinea medida="atenciones" {...resumenZona({
            encima, seleccion: filtros.comuna ?? [], valores: valoresZona, nombres: nombresZona, totales: k,
            quitar: () => quitar('comuna') })} />
        </Stack>
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
            <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 650, fontSize: 16, fontStretch: '105%' }}>
              Atenciones por comuna y corregimiento
            </Typography>
            <Typography component={Link} to="/territorio" sx={{ fontSize: 12.5, color: '#9ec5f4', textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' } }}>Ver territorio</Typography>
          </Stack>
          <MapaTerritorio territorios={data.territorio.territorios} alto={560} oscuro tarjeta={false}
            totales={k} alSenalar={setEncima} />
          {data.territorio.sin_mapa.length > 0 && (
            <Typography sx={{ fontSize: 11.5, color: '#8C97AB', mt: 1 }}>
              Sin polígono en el mapa: {data.territorio.sin_mapa.map((s) => `${etiquetaComuna(s.nombre)} (${num(s.atenciones)})`).join(', ')}.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Información adicional */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mt: 2 }}>
        <Panel titulo="Indicadores de producto" ayuda="Clic en un indicador para filtrar todo el tablero.">
          <Stack gap={1.25}>
            {d.indicador_cod.map((i) => {
              const on = activo(filtros, 'indicador', i.valor)
              return (
                <ButtonBase key={i.valor} onClick={() => alternar('indicador', i.valor)} aria-pressed={on}
                  sx={{ display: 'block', textAlign: 'left', borderRadius: '8px', p: 1, mx: -1,
                    bgcolor: on ? t.unidadSuave : 'transparent', '&:hover': { bgcolor: on ? t.unidadSuave : t.bg } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{i.valor}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>{num(i.atenciones)}
                      <Typography component="span" variant="caption"> atenciones, {pct(i.atenciones, k.atenciones, 0)}</Typography></Typography>
                  </Stack>
                  <Box sx={{ height: 6, bgcolor: t.bg, borderRadius: 3, mt: 0.75, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${(i.atenciones / Math.max(k.atenciones, 1)) * 100}%`, bgcolor: t.unidad, borderRadius: 3 }} />
                  </Box>
                  <Typography variant="caption" component="p" sx={{ lineHeight: 1.4, mt: 0.75 }}>{i.nombre}</Typography>
                </ButtonBase>
              )
            })}
          </Stack>
        </Panel>
        <Panel titulo="Quiénes son" ayuda="Porcentajes sobre personas distintas del filtro activo.">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 2.25, columnGap: 2 }}>
            <Cifra etiqueta="Mujeres" color={t.mujeres} valor={pct(k.mujeres.personas, k.personas)} sub={`${num(k.mujeres.personas)} personas`} />
            <Cifra etiqueta="Hombres" color={t.hombres} valor={pct(k.hombres.personas, k.personas)} sub={`${num(k.hombres.personas)} personas`} />
            <Cifra etiqueta="Edad promedio" valor={k.edad_promedio != null ? `${dec(k.edad_promedio)}` : '—'} sub="años al ingreso" />
            <Cifra etiqueta="Menores de 18" valor={pct(k.menores_18, k.personas)} sub={`${num(k.menores_18)} personas`} />
            <Cifra etiqueta="Zona rural" valor={pct(k.rural.personas, k.personas)} sub={`${num(k.rural.personas)} personas`} />
            <Cifra etiqueta="Con discapacidad" valor={pct(k.con_discapacidad, k.personas)} sub="tipo registrado"
              ayuda="Personas con algún tipo de discapacidad registrado. Excluye «No tiene», «Ninguna» y «Sin dato» (cuidadoras y familiares)." />
          </Box>
        </Panel>
        <Panel titulo="Por proyecto" ayuda="Clic en un proyecto para filtrar todo el tablero.">
          <Proporcion alto={8} partes={d.proyecto_cod.map((p, i) => ({ valor: p.atenciones, color: [t.unidad, t.seq[5], t.seq[2]][i % 3], nombre: p.valor }))} />
          <Stack gap={1.5} mt={2}>
            {d.proyecto_cod.map((p, i) => (
              <ButtonBase key={p.valor} onClick={() => alternar('proyecto', p.valor)} aria-pressed={activo(filtros, 'proyecto', p.valor)}
                sx={{ display: 'block', textAlign: 'left', borderRadius: '8px', p: 1, mx: -1,
                  bgcolor: activo(filtros, 'proyecto', p.valor) ? t.unidadSuave : 'transparent', '&:hover': { bgcolor: t.bg } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: [t.unidad, t.seq[5], t.seq[2]][i % 3] }} />
                    {p.valor}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>{num(p.atenciones)}
                    <Typography component="span" variant="caption"> atenciones, {num(p.personas)} pers.</Typography></Typography>
                </Stack>
                <Typography variant="caption" component="p" sx={{ lineHeight: 1.35, mt: 0.25 }}>{oracion(String(p.nombre ?? '').replace(/^\w+-/, ''))}</Typography>
              </ButtonBase>
            ))}
          </Stack>
        </Panel>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 8fr) minmax(0, 4fr)' }, gap: 2, mt: 2 }}>
        <Panel titulo="Atenciones y personas por mes de reporte" ayuda="Clic en un mes para filtrar todo el tablero.">
          <SerieMensual datos={data.serie} series={[
            { clave: 'atenciones', nombre: 'Atenciones', color: t.unidad, tipo: 'barra' },
            { clave: 'personas', nombre: 'Personas distintas', color: t.personas, tipo: 'linea' },
          ]} />
        </Panel>
        <Panel titulo="Tipo de discapacidad">
          <Barras dim="discapacidad" max={7} ancho={130} total={k.atenciones}
            items={d.discapacidad.map((x) => ({ clave: x.valor, etiqueta: quitarDisc(x.valor), atenciones: x.atenciones, personas: x.personas }))} />
        </Panel>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(0, 5fr)' }, gap: 2, mt: 2 }}>
        <Panel titulo="Servicios con más atenciones"
          acciones={<Typography component={Link} to="/servicios" variant="body2" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}>Ver todos</Typography>}>
          <Barras dim="servicio" max={8} ancho={240} total={k.atenciones}
            items={d.servicio.map((x) => ({ clave: x.valor, etiqueta: servicioCorto(x.valor), completo: x.valor, atenciones: x.atenciones,
              personas: x.personas }))} />
        </Panel>
        <Panel titulo="Comunas y corregimientos">
          <Barras dim="comuna" max={8} ancho={170} total={k.atenciones}
            items={[...data.territorio.territorios, ...data.territorio.sin_mapa].sort((a, b) => b.atenciones - a.atenciones)
              .map((x) => ({ clave: x.numero, etiqueta: etiquetaComuna(x.nombre), atenciones: x.atenciones, personas: x.personas }))} />
        </Panel>
      </Box>
    </Marco>
  )
}

