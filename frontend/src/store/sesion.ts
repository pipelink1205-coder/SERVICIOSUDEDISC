import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Rol = 'consulta' | 'analista' | 'admin'
export interface Usuario { usuario: string; nombre: string; rol: Rol }

interface Sesion {
  token: string | null
  usuario: Usuario | null
  modo: 'light' | 'dark'
  entrar: (token: string, usuario: Usuario) => void
  salir: () => void
  alternarModo: () => void
}

export const NIVEL: Record<Rol, number> = { consulta: 1, analista: 2, admin: 3 }

export const useSesion = create<Sesion>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      modo: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      entrar: (token, usuario) => set({ token, usuario }),
      salir: () => set({ token: null, usuario: null }),
      alternarModo: () => set((s) => ({ modo: s.modo === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'epi-sesion' },
  ),
)

export const puede = (u: Usuario | null, rol: Rol) => !!u && NIVEL[u.rol] >= NIVEL[rol]
