import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { api } from '../lib/api'
import { useSesion } from '../store/sesion'
import { FUENTE_DISPLAY } from '../theme'

export default function Login() {
  const entrar = useSesion((s) => s.entrar)
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ usuario, clave }) })
      entrar(r.token, r.usuario)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: '#121A2B' }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 6, color: '#fff',
        position: 'relative', overflow: 'hidden' }}>
        <Stack direction="row" gap={1.25} alignItems="center">
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#1d2840" />
            <path d="M7 23V13l5 4 6-7 7 6v7z" fill="#3987e5" /><circle cx="22.5" cy="9.5" r="3" fill="#eb6834" /></svg>
          <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '115%', fontSize: 19 }}>Analítica EPI</Typography>
        </Stack>
        <Box sx={{ maxWidth: 520 }}>
          <Typography sx={{ fontFamily: FUENTE_DISPLAY, fontWeight: 700, fontStretch: '118%', fontSize: 46, lineHeight: 1.02, letterSpacing: '-0.02em' }}>
            Seguimiento mensual de la Unidad de Discapacidad
          </Typography>
          <Typography sx={{ color: '#AEB8C9', mt: 2.5, fontSize: 16, lineHeight: 1.6, maxWidth: 440 }}>
            Servicios, personas y territorio a partir del reporte estadístico de cada mes, con cruces reales sobre cada registro.
          </Typography>
        </Box>
        <Typography sx={{ color: '#6F7A8F', fontSize: 12.5 }}>Alcaldía de Medellín. Secretaría de Inclusión Social, Familia y Derechos Humanos.</Typography>
        <svg viewBox="0 0 400 400" style={{ position: 'absolute', right: -90, top: 70, width: 420, opacity: 0.5 }} aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M ${20 + i * 8} 360 C 120 ${300 - i * 22}, 220 ${330 - i * 30}, ${380 - i * 4} ${150 - i * 12}`}
              stroke={i === 6 ? '#eb6834' : '#3987e5'} strokeOpacity={i === 6 ? 0.9 : 0.25 + i * 0.05} strokeWidth={i === 6 ? 2 : 1} fill="none" />
          ))}
        </svg>
      </Box>
      <Box sx={{ bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
        borderRadius: { md: '24px 0 0 24px' } }}>
        <Box component="form" onSubmit={enviar} sx={{ width: '100%', maxWidth: 360 }}>
          <Typography variant="h1" sx={{ mb: 0.75 }}>Iniciar sesión</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Usa la cuenta que te asignó el equipo de gestión de la información.</Typography>
          <Stack gap={2}>
            <TextField label="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus autoComplete="username" required />
            <TextField label="Clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
