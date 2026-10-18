import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useT } from '../components/base'
import { ErrorApi } from '../lib/api'
import { puede, useSesion } from '../store/sesion'

/** Estado vacío: todavía no hay cortes, o la consulta falló. */
export function SinCortes({ error }: { error?: Error }) {
  const t = useT()
  const u = useSesion((s) => s.usuario)
  const sinDatos = error instanceof ErrorApi && error.status === 404
  return (
    <Box sx={{ bgcolor: t.paper, border: `1px dashed ${t.line}`, borderRadius: '14px', p: { xs: 3, md: 6 }, maxWidth: 720 }}>
      <Typography variant="h2" sx={{ fontSize: 22 }}>{sinDatos ? 'Todavía no hay datos cargados' : 'No se pudo consultar el tablero'}</Typography>
      <Typography sx={{ color: t.text2, mt: 1.5, lineHeight: 1.6 }}>
        {sinDatos
          ? 'Sube el reporte PI del mes (el libro .xlsm completo). El aplicativo lee la hoja ESTAD. PERSONAS IND. PRODUCTO, guarda el corte y arma todos los tableros.'
          : error?.message}
      </Typography>
      {sinDatos && puede(u, 'analista') && (
        <Button component={Link} to="/cargas" variant="contained" sx={{ mt: 3 }}>Cargar el primer corte</Button>
      )}
      {sinDatos && !puede(u, 'analista') && (
        <Typography variant="body2" sx={{ mt: 2, color: t.text2 }}>Pide a la analista que cargue el corte del mes.</Typography>
      )}
    </Box>
  )
}
