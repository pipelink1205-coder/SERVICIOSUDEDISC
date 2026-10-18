import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Cargando, Cifra, Panel, useT } from '../components/base'
import { Marco } from '../components/Marco'
import { api } from '../lib/api'
import { useCortes } from '../lib/datos'
import { num, pct } from '../lib/formato'
import { useFiltros } from '../store/filtros'
import { SinCortes } from './SinCortes'

const TIPOS: Record<string, { nombre: string; explica: string }> = {
  rechazo: { nombre: 'Fila rechazada', explica: 'No entra a ningún indicador.' },
  duplicado: { nombre: 'Duplicado', explica: 'Se cuenta, pero conviene revisarlo.' },
  inconsistencia: { nombre: 'Inconsistencia', explica: 'Dato que se contradice o está fuera de rango.' },
  variante: { nombre: 'Variante de escritura', explica: 'Mismo valor escrito distinto; se reporta, no se corrige solo.' },
  fuera_mapa: { nombre: 'Sin polígono', explica: 'Se cuenta en tablas pero no aparece en el mapa.' },
  vacio: { nombre: 'Vacío', explica: 'Celda sin valor.' },
  sin_dato: { nombre: 'SIN DATO', explica: 'Registrado explícitamente como SIN DATO.' },
}

export default function Calidad() {
  const t = useT()
  const corteSel = useFiltros((s) => s.corte)
  const { data: cortes } = useCortes()
  const id = corteSel ?? cortes?.cortes[0]?.id
  const [tipo, setTipo] = useState<string>('todos')
  const { data, isLoading, error } = useQuery({ queryKey: ['calidad', id], enabled: !!id,
    queryFn: () => api<any>(`/api/cortes/${id}/calidad`) })
  const color: Record<string, string> = { rechazo: t.critico, duplicado: t.aviso, inconsistencia: t.aviso, variante: t.unidad,
    fuera_mapa: t.unidad, vacio: t.muted, sin_dato: t.muted }
  const desc = 'Lo que el lector encontró al procesar el libro. Las filas son las del Excel, para ubicarlas rápido; no se muestran datos personales.'

  if (cortes && !cortes.cortes.length) return <Marco titulo="Calidad del dato"><SinCortes error={Object.assign(new Error(''), { status: 404 }) as any} /></Marco>
  if (error) return <Marco titulo="Calidad del dato"><SinCortes error={error as Error} /></Marco>
  if (isLoading || !data) return <Marco titulo="Calidad del dato" descripcion={desc}><Cargando alto={500} /></Marco>

  const c = data.corte
  const hallazgos = data.hallazgos as any[]
  const visibles = tipo === 'todos' ? hallazgos : hallazgos.filter((h) => h.tipo === tipo)
  const conteo = (tp: string) => hallazgos.filter((h) => h.tipo === tp).reduce((a, h) => a + h.filas, 0)

  const descargar = () => {
    const filas = [['Tipo', 'Campo', 'Valor', 'Filas afectadas', 'Detalle', 'Filas del Excel (muestra)'],
      ...hallazgos.map((h) => [TIPOS[h.tipo]?.nombre ?? h.tipo, h.campo, h.valor, h.filas, h.detalle, h.ejemplo_filas])]
    const csv = '﻿' + filas.map((f) => f.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `calidad_${c.anio}-${String(c.mes_corte).padStart(2, '0')}.csv`
    a.click()
  }

  return (
    <Marco titulo="Calidad del dato" descripcion={desc}>
      <Box sx={{ bgcolor: t.paper, border: `1px solid ${t.line}`, borderRadius: '12px', p: 2.25, display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(0,1fr))' }, gap: 2.5 }}>
        <Cifra etiqueta={`Filas leídas, ${c.etiqueta}`} valor={num(c.filas_leidas)} sub={`hoja ${c.hoja}`} />
        <Cifra etiqueta="Atenciones válidas" valor={num(c.filas_validas)} sub={pct(c.filas_validas, c.filas_leidas, 2)} />
        <Cifra etiqueta="Filas rechazadas" valor={num(c.filas_rechazadas)} color={t.critico} sub="encabezados o códigos repetidos" />
        <Cifra etiqueta="Posibles duplicados" valor={num(conteo('duplicado'))} color={t.aviso} sub="persona + servicio + mes" />
        <Cifra etiqueta="Celdas SIN DATO" valor={num(conteo('sin_dato'))} color={t.muted} sub="suma en todos los campos" />
      </Box>

      <Panel sx={{ mt: 2 }} pad={0} titulo={undefined}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1.5} sx={{ p: 2.25, pb: 1.5 }}>
          <ToggleButtonGroup size="small" exclusive value={tipo} onChange={(_, v) => v && setTipo(v)} sx={{ flexWrap: 'wrap' }}>
            <ToggleButton value="todos" sx={{ px: 1.5 }}>Todos ({hallazgos.length})</ToggleButton>
            {Object.keys(TIPOS).filter((tp) => hallazgos.some((h) => h.tipo === tp)).map((tp) => (
              <ToggleButton key={tp} value={tp} sx={{ px: 1.5 }}>{TIPOS[tp].nombre} ({hallazgos.filter((h) => h.tipo === tp).length})</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button size="small" variant="outlined" startIcon={<FileDownloadOutlined />} onClick={descargar}>Descargar CSV</Button>
        </Stack>
        {tipo !== 'todos' && <Typography variant="body2" sx={{ px: 2.25, pb: 1, color: t.text2 }}>{TIPOS[tipo]?.explica}</Typography>}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 2.25 }}>Tipo</TableCell><TableCell>Campo</TableCell><TableCell>Valor</TableCell>
                <TableCell align="right">Filas</TableCell><TableCell>Detalle</TableCell><TableCell sx={{ pr: 2.25 }}>Filas del Excel</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibles.map((h, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ pl: 2.25 }}>
                    <Chip size="small" label={TIPOS[h.tipo]?.nombre ?? h.tipo}
                      sx={{ bgcolor: 'transparent', border: `1px solid ${color[h.tipo]}`, color: t.text, fontWeight: 600,
                        '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: color[h.tipo], ml: 1 } }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{h.campo}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{h.valor}</Typography></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 650 }}>{num(h.filas)}</TableCell>
                  <TableCell sx={{ maxWidth: 380, color: t.text2 }}>{h.detalle}</TableCell>
                  <TableCell sx={{ pr: 2.25, maxWidth: 220 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'inherit', wordBreak: 'break-word' }}>{h.ejemplo_filas || '—'}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Panel>
    </Marco>
  )
}
