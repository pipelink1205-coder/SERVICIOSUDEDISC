import { MESES, nombreComuna, oracion, quitarDisc, servicioCorto } from './formato'

/** Dimensiones filtrables: nombre visible y cómo mostrar cada valor. */
export const DIMENSIONES: Record<string, { nombre: string; etiqueta: (v: any, extra?: any) => string; sensible?: boolean }> = {
  mes: { nombre: 'Mes', etiqueta: (v) => MESES[Number(v) - 1] ?? String(v) },
  servicio: { nombre: 'Servicio', etiqueta: (v) => servicioCorto(v) },
  indicador: { nombre: 'Indicador', etiqueta: (v) => String(v) },
  proyecto: { nombre: 'Proyecto', etiqueta: (v) => String(v) },
  comuna: { nombre: 'Comuna o corregimiento', etiqueta: (v, e) => (e?.nombre ? `${v} ${nombreComuna(e.nombre)}` : String(v)) },
  sexo: { nombre: 'Sexo', etiqueta: (v) => oracion(v) },
  discapacidad: { nombre: 'Discapacidad', etiqueta: (v) => quitarDisc(v) },
  edad: { nombre: 'Rango de edad', etiqueta: (v) => `${v} años` },
  area: { nombre: 'Área', etiqueta: (v) => oracion(v) },
  estrato: { nombre: 'Estrato', etiqueta: (v) => oracion(v) },
  escolaridad: { nombre: 'Escolaridad', etiqueta: (v) => oracion(v) },
  salud: { nombre: 'Régimen de salud', etiqueta: (v) => oracion(v) },
  etnia: { nombre: 'Etnia', etiqueta: (v) => oracion(v) },
  pais: { nombre: 'País de nacimiento', etiqueta: (v) => oracion(v) },
  victima: { nombre: 'Hecho victimizante', etiqueta: (v) => oracion(v), sensible: true },
}

export const ORDEN_FILTROS = ['mes', 'servicio', 'indicador', 'proyecto', 'comuna', 'sexo', 'discapacidad', 'edad', 'area',
  'estrato', 'escolaridad', 'salud', 'etnia', 'pais', 'victima']
