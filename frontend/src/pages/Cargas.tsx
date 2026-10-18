import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel, useT } from '../components/base'
import { Marco } from '../components/Marco'
import { api } from '../lib/api'
import { useCortes } from '../lib/datos'
import { MESES, num } from '../lib/formato'
import { useFiltros } from '../store/filtros'
import { puede, useSesion } from '../store/sesion'

export default function Cargas() {
  const t = useT()
  const qc = useQueryClient()
  const u = useSesion((s) => s.usuario)
  const setCorte = useFiltros((s) => s.setCorte)
  const { data } = useCortes()
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [anio, setAnio] = useState<string>('')
  const [mes, setMes] = useState<string>('')
  const [reemplazar, setReemplazar] = useState(false)
  const [ruta, setRuta] = useState('')
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | 'cargando'; texto: string; detalle?: any } | null>(null)

  const refrescar = (id?: number) => {
    qc.invalidateQueries()
    if (id) setCorte(id)
  }

  const subir = async () => {
    if (!archivo) return
    setEstado({ tipo: 'cargando', texto: `Leyendo ${archivo.name}. Un libro de 35 MB tarda unos 15 segundos.` })
    const fd = new FormData()
    fd.append('archivo', archivo)
    if (anio) fd.append('anio', anio)
    if (mes) fd.append('mes_corte', mes)
    fd.append('reemplazar', String(reemplazar))
    try {
      const r = await api('/api/cortes/subir', { method: 'POST', body: fd })
      setEstado({ tipo: 'ok', texto: `Corte de ${MESES[r.mes_corte - 1].toLowerCase()} ${r.anio} cargado.`, detalle: r })
      setArchivo(null)
      refrescar(r.id)
    } catch (e: any) {
      setEstado({ tipo: 'error', texto: e.message })
    }
  }

  const leerRuta = async () => {
    setEstado({ tipo: 'cargando', texto: 'Leyendo los libros de la ruta indicada.' })
    try {
      const r = await api('/api/cortes/ruta', { method: 'POST', body: JSON.stringify({ ruta: ruta || data?.carpeta_defecto,
        anio: anio ? Number(anio) : null, mes_corte: mes ? Number(mes) : null, reemplazar }) })
      const ok = r.cargados.length
      setEstado({ tipo: r.errores.length ? 'error' : 'ok',
        texto: `${ok} ${ok === 1 ? 'corte cargado' : 'cortes cargados'}.` + (r.errores.length ? ` ${r.errores.map((e: any) => `${e.archivo}: ${e.error}`).join(' ')}` : ''),
        detalle: r.cargados.at(-1) })
      refrescar(r.cargados.at(-1)?.id)
    } catch (e: any) {
      setEstado({ tipo: 'error', texto: e.message })
    }
  }

  const borrar = async (id: number, etiqueta: string) => {
    if (!window.confirm(`¿Eliminar el corte de ${etiqueta}? Se borran sus atenciones y su reporte de calidad.`)) return
    await api(`/api/cortes/${id}`, { method: 'DELETE' })
    refrescar()
  }

  const det = estado?.detalle
  return (
    <Marco titulo="Cargas" descripcion="Sube el reporte PI del mes. Se lee la hoja ESTAD. PERSONAS IND. PRODUCTO; las demás hojas quedan registradas para fases siguientes.">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,7fr) minmax(0,5fr)' }, gap: 2 }}>
        <Panel titulo="Subir el libro del mes">
          <Box onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files[0]; if (f) setArchivo(f) }}
            onClick={() => entrada.current?.click()} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && entrada.current?.click()}
            sx={{ border: `1.5px dashed ${arrastrando ? t.unidad : t.line}`, bgcolor: arrastrando ? t.unidadSuave : t.bg, borderRadius: '12px',
              py: 5, px: 3, textAlign: 'center', cursor: 'pointer', transition: 'all .15s' }}>
            <CloudUploadOutlined sx={{ fontSize: 40, color: t.unidad }} />
            <Typography sx={{ fontWeight: 650, mt: 1 }}>{archivo ? archivo.name : 'Arrastra aquí el .xlsm o .xlsx'}</Typography>
            <Typography variant="body2" sx={{ color: t.text2, mt: 0.5 }}>
              {archivo ? `${(archivo.size / 1048576).toFixed(1)} MB, listo para cargar` : 'o haz clic para elegirlo'}
            </Typography>
            <input ref={entrada} type="file" hidden accept=".xlsx,.xlsm" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mt={2} alignItems={{ sm: 'center' }}>
            <TextField size="small" label="Año" value={anio} onChange={(e) => setAnio(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Automático" sx={{ width: { sm: 120 } }} />
            <TextField size="small" select label="Mes de corte" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ width: { sm: 170 } }}>
              <MenuItem value="">Automático</MenuItem>
              {MESES.map((m, i) => <MenuItem key={m} value={String(i + 1)}>{m}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Checkbox size="small" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />}
              label={<Typography variant="body2">Reemplazar si ya existe</Typography>} />
            <Box flex={1} />
            <Button variant="contained" disabled={!archivo || estado?.tipo === 'cargando'} onClick={subir}>Cargar corte</Button>
          </Stack>
          <Typography variant="caption" component="p" sx={{ mt: 1.5 }}>
            El año y el mes se deducen del nombre del archivo (por ejemplo «Reporte PI diciembre_2025»). Un nuevo libro del mismo año y mes reemplaza al anterior.
          </Typography>
        </Panel>

        <Panel titulo="Leer desde una carpeta del equipo" ayuda="Útil para reprocesar sin subir el archivo por el navegador. La ruta debe existir en el equipo donde corre el servidor.">
          <TextField fullWidth size="small" label="Archivo o carpeta" value={ruta} onChange={(e) => setRuta(e.target.value)}
            placeholder={data?.carpeta_defecto || 'C:\\...\\Reportes'} multiline maxRows={3} />
          <Typography variant="caption" component="p" sx={{ mt: 1 }}>
            Si es una carpeta, se leen todos los .xlsx y .xlsm que contenga. {data?.carpeta_defecto ? 'Vacío usa la carpeta configurada en .env.' : ''}
          </Typography>
          <Button variant="outlined" startIcon={<FolderOpenOutlined />} sx={{ mt: 2 }} onClick={leerRuta}
            disabled={(!ruta && !data?.carpeta_defecto) || estado?.tipo === 'cargando'}>Leer ruta</Button>
        </Panel>
      </Box>

      {estado && (
        <Box mt={2}>
          {estado.tipo === 'cargando' && <Box><LinearProgress sx={{ borderRadius: 2, mb: 1 }} /><Typography variant="body2">{estado.texto}</Typography></Box>}
          {estado.tipo === 'error' && <Alert severity="error">{estado.texto}</Alert>}
          {estado.tipo === 'ok' && (
            <Alert severity="success" action={<Button component={Link} to="/" color="inherit" size="small">Ver tablero</Button>}>
              {estado.texto}{det && <> {num(det.filas_leidas)} filas leídas, <strong>{num(det.filas_validas)} atenciones</strong> válidas,
                {' '}{num(det.filas_rechazadas)} rechazadas, <strong>{num(det.personas)} personas</strong>. {det.hallazgos_calidad} hallazgos en <Link to="/calidad">calidad del dato</Link>.</>}
            </Alert>
          )}
        </Box>
      )}

      <Panel titulo="Historial de cortes" sx={{ mt: 2 }} pad={0}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2.25 }}>Corte</TableCell><TableCell>Archivo</TableCell>
                <TableCell align="right">Filas leídas</TableCell><TableCell align="right">Atenciones</TableCell>
                <TableCell align="right">Rechazadas</TableCell><TableCell align="right">Personas</TableCell>
                <TableCell>Cargado</TableCell><TableCell>Hojas del libro</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.cortes ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell sx={{ pl: 2.25, fontWeight: 650 }}>{c.etiqueta}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" noWrap title={c.archivo}>{c.archivo}</Typography></TableCell>
                  <TableCell align="right">{num(c.filas_leidas)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 650 }}>{num(c.filas_validas)}</TableCell>
                  <TableCell align="right">{num(c.filas_rechazadas)}</TableCell>
                  <TableCell align="right">{num(c.personas)}</TableCell>
                  <TableCell><Typography variant="body2">{c.fecha_carga.replace('T', ' ').slice(0, 16)}</Typography>
                    <Typography variant="caption">{c.usuario}, {c.origen === 'web' ? 'subida web' : 'ruta local'}</Typography></TableCell>
                  <TableCell>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ maxWidth: 360 }}>
                      {c.hojas_libro.map((h) => <Chip key={h} size="small" label={h.trim()} variant={h === c.hoja ? 'filled' : 'outlined'}
                        sx={h === c.hoja ? { bgcolor: t.unidadSuave, fontWeight: 650 } : { borderColor: t.line, color: t.text2 }} />)}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {puede(u, 'admin') && (
                      <Tooltip title="Eliminar corte"><IconButton size="small" onClick={() => borrar(c.id, c.etiqueta)}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.cortes.length && (
                <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: t.text2 }}>Aún no hay cortes. Sube el primer libro arriba.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Panel>
    </Marco>
  )
}
