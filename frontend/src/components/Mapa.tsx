import 'leaflet/dist/leaflet.css'
import { Box, Stack, Typography, useTheme } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { Feature, FeatureCollection } from 'geojson'
import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import { num } from '../lib/formato'
import type { Territorio } from '../lib/datos'
import { useFiltros } from '../store/filtros'
import { FUENTE_DISPLAY, tokens } from '../theme'

function Encuadre({ datos, reservar }: { datos: FeatureCollection; reservar: boolean }) {
  const map = useMap()
  useEffect(() => {
    const capa = L.geoJSON(datos as any)
    const ancho = map.getContainer().clientWidth
    // en mapas anchos se reserva el costado derecho para la tarjeta de zona
    const derecha = reservar && ancho > 620 ? 250 : 16
    map.fitBounds(capa.getBounds(), { paddingTopLeft: [16, 16], paddingBottomRight: [derecha, 16] })
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [datos, map, reservar])
  return null
}

/** Cortes de clase por cuantiles (5 clases), redondeados a números legibles. */
function cortes(valores: number[], n = 5): number[] {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b)
  if (!v.length) return []
  const res: number[] = []
  for (let i = 1; i < n; i++) {
    const q = v[Math.min(v.length - 1, Math.floor((i / n) * v.length))]
    const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(q)) - 1))
    const r = Math.round(q / mag) * mag
    if (!res.includes(r) && r > (res.at(-1) ?? 0)) res.push(r)
  }
  return res
}

export function MapaTerritorio({ territorios, medida = 'atenciones', alto = 460, rampa = 'azul', oscuro = false,
  etiquetas = true, tarjeta = true, totales, alSenalar }: {
  territorios: Territorio[]; medida?: 'atenciones' | 'personas'; alto?: number | string; rampa?: 'azul' | 'naranja'
  oscuro?: boolean; etiquetas?: boolean; tarjeta?: boolean
  /** Totales exactos del filtro activo (personas sin duplicar entre zonas). */
  totales?: { atenciones: number; personas: number }
  /** Avisa qué zona tiene el cursor encima (para mostrarla fuera del mapa). */
  alSenalar?: (numero: number | null) => void
}) {
  const modo = useTheme().palette.mode
  const t = tokens[oscuro ? 'dark' : modo]
  const { data: geo } = useQuery({
    queryKey: ['geojson'],
    queryFn: () => fetch('/maps/comunas.geojson').then((r) => r.json() as Promise<FeatureCollection>),
    staleTime: Infinity,
  })
  const filtros = useFiltros((s) => s.filtros)
  const alternar = useFiltros((s) => s.alternar)
  const quitar = useFiltros((s) => s.quitar)
  const seleccion = filtros.comuna ?? []
  const [encima, setEncima] = useState<{ n: number; nombre: string } | null>(null)
  const nombres = useMemo(() => new Map<number, string>(
    (geo?.features ?? []).map((f) => [f.properties!.numero as number, String(f.properties!.nombre)])), [geo])

  const valores = useMemo(() => {
    const m = new Map<number, Territorio>()
    territorios.forEach((x) => x.numero != null && m.set(x.numero, x))
    return m
  }, [territorios])
  const limites = useMemo(() => cortes([...valores.values()].map((x) => x[medida])), [valores, medida])
  const escala = rampa === 'azul' ? t.seq : t.seqNaranja
  const colores = [escala[1], escala[2], escala[3], escala[4], escala[6]]
  const color = (v: number) => {
    if (!v) return oscuro || modo === 'dark' ? '#202838' : '#EEF1F5'
    let i = 0
    while (i < limites.length && v >= limites[i]) i++
    return colores[Math.min(i, colores.length - 1)]
  }
  const firma = JSON.stringify([territorios.map((x) => [x.numero, x[medida]]), seleccion, medida, oscuro, modo])

  const estilo = (f?: Feature) => {
    const n = f?.properties?.numero as number
    const v = valores.get(n)?.[medida] ?? 0
    const sel = seleccion.includes(String(n))
    const atenuado = seleccion.length > 0 && !sel
    return {
      fillColor: color(v), fillOpacity: atenuado ? 0.35 : 0.88,
      color: sel ? (oscuro || modo === 'dark' ? '#FFFFFF' : '#172033') : (oscuro || modo === 'dark' ? '#0B1120' : '#FFFFFF'),
      weight: sel ? 2.5 : 1.2,
    }
  }

  const alCrear = (f: Feature, capa: L.Layer) => {
    const n = f.properties?.numero as number
    const nombre = f.properties?.nombre as string
    const d = valores.get(n)
    const pl = capa as L.Path
    void d
    pl.on({
      click: () => alternar('comuna', n),
      mouseover: () => { pl.setStyle({ weight: 2.5 }); setEncima({ n, nombre }); alSenalar?.(n) },
      mouseout: () => { pl.setStyle(estilo(f)); setEncima(null); alSenalar?.(null) },
    })
  }

  const centroides = useMemo(() => geo?.features.map((f) => ({
    n: f.properties!.numero as number, lat: f.properties!.clat as number, lon: f.properties!.clon as number })) ?? [], [geo])

  return (
    <Box sx={{ position: 'relative', height: alto, borderRadius: '10px', overflow: 'hidden', bgcolor: oscuro ? '#0B1120' : t.bg,
      '& .leaflet-container': { background: 'transparent', fontFamily: 'inherit' },
      '& .tt-mapa-cont': { bgcolor: '#172033', color: '#fff', border: 0, borderRadius: '8px', boxShadow: 'none', p: '8px 10px' },
      '& .tt-mapa-cont::before': { display: 'none' },
      '& .tt-mapa': { display: 'flex', flexDirection: 'column', gap: '1px', fontSize: 12 },
      '& .tt-mapa em': { opacity: 0.65, fontStyle: 'normal', fontSize: 11, mt: '3px' },
      '& .etq-mapa': { bgcolor: 'transparent', border: 0, boxShadow: 'none', p: 0, fontWeight: 700, fontSize: 11,
        color: oscuro || modo === 'dark' ? '#fff' : '#172033', textShadow: oscuro || modo === 'dark'
          ? '0 0 3px #0B1120, 0 0 3px #0B1120' : '0 0 3px #fff, 0 0 3px #fff, 0 0 2px #fff', pointerEvents: 'none' },
      '& .etq-mapa::before': { display: 'none' },
    }}>
      {geo && (
        <MapContainer center={[6.25, -75.6]} zoom={11} scrollWheelZoom={false} zoomControl={!oscuro}
          attributionControl={false} zoomSnap={0.25} style={{ height: '100%', width: '100%' }}>
          <GeoJSON key={firma} data={geo} style={estilo as any} onEachFeature={alCrear} />
          {etiquetas && <Etiquetas centroides={centroides} valores={valores} medida={medida} />}
          <Encuadre datos={geo} reservar={tarjeta} />
        </MapContainer>
      )}
      {tarjeta && <TarjetaZona {...resumenZona({ encima: encima?.n ?? null, seleccion, valores, nombres, totales,
        quitar: () => quitar('comuna') })} medida={medida} />}
      {limites.length > 0 && (
        <Stack sx={{ position: 'absolute', left: 12, bottom: 12, zIndex: 500, bgcolor: oscuro ? 'rgba(11,17,32,.82)' : t.paper,
          border: `1px solid ${t.line}`, borderRadius: '8px', px: 1.25, py: 1 }} gap={0.5}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.text2 }}>{medida === 'atenciones' ? 'Atenciones' : 'Personas'}</Typography>
          <Stack direction="row" gap={0.25}>
            {colores.slice(0, limites.length + 1).map((c, i) => (
              <Box key={i} sx={{ textAlign: 'center' }}>
                <Box sx={{ width: 34, height: 8, bgcolor: c, borderRadius: i === 0 ? '3px 0 0 3px' : i === limites.length ? '0 3px 3px 0' : 0 }} />
                <Typography sx={{ fontSize: 10, color: t.text2, mt: 0.25 }}>
                  {i === 0 ? `< ${num(limites[0])}` : `${num(limites[i - 1])}+`}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      )}
    </Box>
  )
}

function Etiquetas({ centroides, valores, medida }: {
  centroides: { n: number; lat: number; lon: number }[]; valores: Map<number, Territorio>; medida: 'atenciones' | 'personas'
}) {
  const map = useMap()
  useEffect(() => {
    const grupo = L.layerGroup(
      centroides.map((c) => {
        const v = valores.get(c.n)?.[medida] ?? 0
        return L.tooltip({ permanent: true, direction: 'center', className: 'etq-mapa', interactive: false })
          .setLatLng([c.lat, c.lon]).setContent(v ? String(c.n) : '')
      }),
    ).addTo(map)
    return () => { grupo.remove() }
  }, [centroides, valores, medida, map])
  return null
}

/** Tarjeta flotante con la zona señalada o seleccionada en el mapa. */
export function TarjetaZona({ etiqueta, titulo, valores, medida, pista, alQuitar, enLinea = false }: {
  etiqueta: string; titulo: string; valores: { atenciones: number; personas: number }; medida: 'atenciones' | 'personas'
  pista?: string; alQuitar?: () => void; enLinea?: boolean
}) {
  const otra = medida === 'atenciones' ? 'personas' : 'atenciones'
  return (
    <Box role="status" aria-live="polite" sx={enLinea
      ? { bgcolor: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', borderRadius: '14px', color: '#fff',
        px: 2.25, py: 2, minHeight: 196 }
      : { position: 'absolute', top: 12, right: 12, zIndex: 500, width: { xs: 190, sm: 230 },
      bgcolor: 'rgba(18,26,43,.94)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '16px', color: '#fff',
      px: 2.25, py: 2, backdropFilter: 'blur(6px)', pointerEvents: alQuitar ? 'auto' : 'none' }}>
      <Typography sx={{ fontSize: 13, color: '#C9D1DE' }}>{etiqueta}</Typography>
      <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontSize: 17, lineHeight: 1.2, mt: 0.5, letterSpacing: '0.01em',
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{titulo}</Typography>
      <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 750, fontStretch: '112%', fontSize: 40, lineHeight: 1.05, mt: 1.25,
        color: '#4C8FEA', letterSpacing: '-0.02em' }}>{num(valores[medida])}</Typography>
      <Typography sx={{ fontSize: 13, color: '#C9D1DE', mt: 0.75 }}>{medida} en los filtros actuales</Typography>
      <Typography sx={{ fontSize: 12.5, color: '#8C97AB', mt: 0.25 }}>{num(valores[otra])} {otra}</Typography>
      {pista && <Typography sx={{ fontSize: 11.5, color: '#6F7A8F', mt: 1.25 }}>{pista}</Typography>}
      {alQuitar && (
        <Box component="button" onClick={alQuitar} sx={{ all: 'unset', cursor: 'pointer', mt: 1.25, fontSize: 12, fontWeight: 600,
          color: '#9ec5f4', '&:hover': { textDecoration: 'underline' }, '&:focus-visible': { outline: '2px solid #9ec5f4' } }}>
          Quitar selección
        </Box>
      )}
    </Box>
  )
}

/** Qué mostrar de la zona: la que tiene el cursor, la seleccionada, varias, o el total. */
export function resumenZona({ encima, seleccion, valores, nombres, totales, quitar }: {
  encima: number | null; seleccion: string[]; valores: Map<number, Territorio>; nombres: Map<number, string>
  totales?: { atenciones: number; personas: number }; quitar: () => void
}) {
  const zona = (n: number) => ({ n, nombre: nombres.get(n) ?? String(n), d: valores.get(n) })
  const suma = (xs: (Territorio | undefined)[]) => (totales && xs.length !== 1 ? totales : {
    atenciones: xs.reduce((a, x) => a + (x?.atenciones ?? 0), 0), personas: xs.reduce((a, x) => a + (x?.personas ?? 0), 0) })
  if (encima != null) {
    const z = zona(encima)
    const sel = seleccion.includes(String(z.n))
    return { etiqueta: sel ? 'Zona seleccionada' : 'Zona', titulo: `${z.n} - ${z.nombre.toUpperCase()}`,
      valores: suma([z.d]), pista: sel ? 'Clic para quitarla del filtro' : 'Clic para filtrar el tablero' }
  }
  if (seleccion.length === 1) {
    const z = zona(Number(seleccion[0]))
    return { etiqueta: 'Zona seleccionada', titulo: `${z.n} - ${z.nombre.toUpperCase()}`, valores: suma([z.d]), alQuitar: quitar }
  }
  if (seleccion.length > 1) {
    const zs = seleccion.map((x) => zona(Number(x)))
    return { etiqueta: `${zs.length} zonas seleccionadas`, titulo: zs.map((z) => z.nombre.toUpperCase()).join(', '),
      valores: suma(zs.map((z) => z.d)), alQuitar: quitar }
  }
  return { etiqueta: 'Todos los territorios', titulo: 'MEDELLÍN', valores: suma([...valores.values()]),
    pista: 'Pasa el cursor o haz clic en una comuna del mapa' }
}
