import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useFiltros } from '../store/filtros'
import { api, query } from './api'

export interface Conteo { valor: any; atenciones: number; personas: number; indicador?: string; nombre?: string }
export interface Territorio { numero: number | null; nombre: string; atenciones: number; personas: number }
export interface Serie { mes: number; nombre: string; atenciones: number; personas: number; personas_primera_vez: number }
export interface Matriz { filas: any[]; columnas: any[]; valores: number[][] }
export interface Corte {
  id: number; anio: number; mes_corte: number; etiqueta: string; archivo: string; origen: string; hoja: string
  hojas_libro: string[]; filas_leidas: number; filas_validas: number; filas_rechazadas: number; personas: number
  usuario: string; fecha_carga: string; nota?: string
}
export interface ParSexo { atenciones: number; personas: number }
export interface Kpis {
  atenciones: number; personas: number; atenciones_sin_documento: number
  mujeres: ParSexo; hombres: ParSexo; otro_sexo: ParSexo; urbana: ParSexo; rural: ParSexo
  edad_promedio: number | null; edad_mediana: number | null; menores_18: number; mayores_60: number
  nuevos: number; vienen: number; servicios_activos: number; territorios: number; meses_con_reporte: number
  con_discapacidad: number; victimas?: ParSexo
}
export interface Tablero {
  corte: Corte
  kpis: Kpis
  universo: { atenciones: number; personas: number }
  dimensiones: Record<string, Conteo[]>
  serie: Serie[]
  piramide: { rango: string; hombres: number; mujeres: number; otro: number }[]
  territorio: { territorios: Territorio[]; sin_mapa: Territorio[] }
  barrios: Conteo[]
  matriz_mes_comuna: Matriz
  matriz_servicio_mes: Matriz
  matriz_discapacidad_sexo: Matriz
}

export function useCortes() {
  return useQuery({ queryKey: ['cortes'], queryFn: () => api<{ cortes: Corte[]; carpeta_defecto: string }>('/api/cortes') })
}

export function useOpciones() {
  const corte = useFiltros((s) => s.corte)
  return useQuery({
    queryKey: ['opciones', corte],
    queryFn: () => api<{ corte: Corte; opciones: Record<string, { valor: any; n: number; nombre?: string }[]> }>(
      `/api/opciones${query({ corte })}`),
    retry: false,
  })
}

function useConsulta<T>(ruta: string, clave: string, extra: Record<string, any> = {}, habilitado = true) {
  const { corte, filtros } = useFiltros()
  return useQuery({
    queryKey: [clave, corte, filtros, extra],
    queryFn: () => api<T>(`${ruta}${query({ corte, ...filtros, ...extra })}`),
    placeholderData: keepPreviousData,
    retry: false,
    enabled: habilitado,
  })
}

export const useTablero = () => useConsulta<Tablero>('/api/tablero', 'tablero')
export const useVulnerabilidad = () => useConsulta<any>('/api/vulnerabilidad', 'vulnerabilidad')
export const useComparar = (a?: number, b?: number) =>
  useConsulta<any>('/api/comparar', 'comparar', { a, b }, !!a && !!b && a !== b)

