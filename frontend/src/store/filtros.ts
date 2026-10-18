import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Filtros = Record<string, string[]>

interface Estado {
  corte: number | null
  filtros: Filtros
  setCorte: (c: number | null) => void
  alternar: (dim: string, valor: string | number) => void
  fijar: (dim: string, valores: string[]) => void
  quitar: (dim: string, valor?: string) => void
  limpiar: () => void
}

export const useFiltros = create<Estado>()(
  persist(
    (set) => ({
      corte: null,
      filtros: {},
      setCorte: (corte) => set({ corte }),
      alternar: (dim, valor) =>
        set((s) => {
          const v = String(valor)
          const actual = s.filtros[dim] ?? []
          const nuevo = actual.includes(v) ? actual.filter((x) => x !== v) : [...actual, v]
          const f = { ...s.filtros, [dim]: nuevo }
          if (!nuevo.length) delete f[dim]
          return { filtros: f }
        }),
      fijar: (dim, valores) =>
        set((s) => {
          const f = { ...s.filtros, [dim]: valores }
          if (!valores.length) delete f[dim]
          return { filtros: f }
        }),
      quitar: (dim, valor) =>
        set((s) => {
          const f = { ...s.filtros }
          if (valor == null) delete f[dim]
          else {
            f[dim] = (f[dim] ?? []).filter((x) => x !== valor)
            if (!f[dim].length) delete f[dim]
          }
          return { filtros: f }
        }),
      limpiar: () => set({ filtros: {} }),
    }),
    { name: 'epi-filtros' },
  ),
)

export const activo = (f: Filtros, dim: string, valor: string | number | null | undefined) =>
  valor != null && (f[dim] ?? []).includes(String(valor))
