import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Cargando } from './components/base'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import { puede, useSesion, type Rol } from './store/sesion'
import { crearTema } from './theme'

const Servicios = lazy(() => import('./pages/Servicios'))
const Personas = lazy(() => import('./pages/Personas'))
const Territorio = lazy(() => import('./pages/Territorio'))
const Evolucion = lazy(() => import('./pages/Evolucion'))
const Vulnerabilidad = lazy(() => import('./pages/Vulnerabilidad'))
const Cargas = lazy(() => import('./pages/Cargas'))
const Calidad = lazy(() => import('./pages/Calidad'))
const Admin = lazy(() => import('./pages/Admin'))

const cliente = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } })

function Con({ rol, children }: { rol: Rol; children: ReactNode }) {
  const u = useSesion((s) => s.usuario)
  return puede(u, rol) ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  const modo = useSesion((s) => s.modo)
  const token = useSesion((s) => s.token)
  const tema = useMemo(() => crearTema(modo), [modo])
  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <QueryClientProvider client={cliente}>
        {!token ? <Login /> : (
          <BrowserRouter>
            <Suspense fallback={<div style={{ padding: 32 }}><Cargando /></div>}>
              <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/servicios" element={<Servicios />} />
                <Route path="/personas" element={<Personas />} />
                <Route path="/territorio" element={<Territorio />} />
                <Route path="/evolucion" element={<Evolucion />} />
                <Route path="/vulnerabilidad" element={<Con rol="admin"><Vulnerabilidad /></Con>} />
                <Route path="/cargas" element={<Con rol="analista"><Cargas /></Con>} />
                <Route path="/calidad" element={<Con rol="analista"><Calidad /></Con>} />
                <Route path="/admin" element={<Con rol="admin"><Admin /></Con>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
