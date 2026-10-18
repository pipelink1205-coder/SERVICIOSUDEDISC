import { Alert, Box, Button, Chip, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Panel, useT } from '../components/base'
import { Marco } from '../components/Marco'
import { api } from '../lib/api'

export default function Admin() {
  return (
    <Marco titulo="Administración" descripcion="Usuarios y registro de auditoría.">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,6fr) minmax(0,6fr)' }, gap: 2 }}>
        <Usuarios />
        <Auditoria />
      </Box>
    </Marco>
  )
}

function Usuarios() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['usuarios'], queryFn: () => api<any[]>('/api/admin/usuarios') })
  const [nuevo, setNuevo] = useState({ usuario: '', nombre: '', rol: 'consulta', clave: '' })
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const guardar = async (u: any) => {
    try {
      await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(u) })
      setMsg({ ok: true, texto: `Usuario ${u.usuario} guardado.` })
      setNuevo({ usuario: '', nombre: '', rol: 'consulta', clave: '' })
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    } catch (e: any) { setMsg({ ok: false, texto: e.message }) }
  }
  return (
    <Panel titulo="Usuarios" ayuda="consulta: ve tableros. analista: además carga cortes y revisa calidad. admin: además Vulnerabilidad y usuarios.">
      <Table size="small">
        <TableHead><TableRow><TableCell>Usuario</TableCell><TableCell>Nombre</TableCell><TableCell>Rol</TableCell><TableCell>Activo</TableCell></TableRow></TableHead>
        <TableBody>
          {(data ?? []).map((u) => (
            <TableRow key={u.usuario}>
              <TableCell sx={{ fontWeight: 600 }}>{u.usuario}</TableCell>
              <TableCell>{u.nombre}</TableCell>
              <TableCell>
                <TextField select size="small" variant="standard" value={u.rol} onChange={(e) => guardar({ ...u, rol: e.target.value, activo: !!u.activo })}>
                  {['consulta', 'analista', 'admin'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </TableCell>
              <TableCell><Switch size="small" checked={!!u.activo} onChange={(e) => guardar({ ...u, activo: e.target.checked })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="h3" sx={{ mt: 2.5, mb: 1.5 }}>Agregar usuario</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <TextField size="small" label="Usuario" value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })} />
        <TextField size="small" label="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
        <TextField size="small" select label="Rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
          {['consulta', 'analista', 'admin'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Clave inicial" type="password" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })}
          helperText="Mínimo 8 caracteres" />
      </Box>
      <Button variant="contained" size="small" sx={{ mt: 1.5 }} disabled={!nuevo.usuario || !nuevo.nombre || nuevo.clave.length < 8}
        onClick={() => guardar({ ...nuevo, activo: true })}>Crear usuario</Button>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>{msg.texto}</Alert>}
    </Panel>
  )
}

function Auditoria() {
  const t = useT()
  const { data } = useQuery({ queryKey: ['auditoria'], queryFn: () => api<any[]>('/api/admin/auditoria') })
  return (
    <Panel titulo="Auditoría" ayuda="Inicios de sesión, cargas, exportaciones, consultas de Vulnerabilidad y cambios de configuración.">
      <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Usuario</TableCell><TableCell>Acción</TableCell><TableCell>Detalle</TableCell></TableRow></TableHead>
          <TableBody>
            {(data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.fecha.replace('T', ' ').slice(0, 16)}</TableCell>
                <TableCell>{a.usuario}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{a.accion.replace(/_/g, ' ')}</TableCell>
                <TableCell sx={{ color: t.text2, maxWidth: 260, wordBreak: 'break-word' }}>{a.detalle}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Panel>
  )
}
