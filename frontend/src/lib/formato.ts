const nf = new Intl.NumberFormat('es-CO')
export const num = (n: number | null | undefined) => (n == null ? '—' : nf.format(Math.round(n)))
export const dec = (n: number | null | undefined, d = 1) =>
  n == null ? '—' : new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
export const pct = (a: number, b: number, d = 1) => (b ? `${dec((a / b) * 100, d)} %` : '—')
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** "APOYO ECONÓMICO PARA PERSONAS CON DISCAPACIDAD" -> "Apoyo económico para personas con discapacidad" */
const SIGLAS = new Set(['NNA', 'PPT', 'MAP', 'MUSE', 'AEI', 'SI', 'II'])
export function oracion(t: string | null | undefined): string {
  if (!t) return '(vacío)'
  if (t !== t.toUpperCase()) return t
  const palabras = t.toLowerCase().split(' ')
  return palabras
    .map((p, i) => {
      const up = p.toUpperCase()
      if (SIGLAS.has(up.replace(/[^A-Z]/g, '')) && up !== 'SI') return up
      return i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p
    })
    .join(' ')
}

/** Nombre corto de comuna: "13 SAN JAVIER" -> "San Javier" */
export function nombreComuna(t: string | null | undefined): string {
  if (!t) return '(vacío)'
  const s = t.replace(/^\s*\d+\s*-?\s*/, '')
  return s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()).replace(/\bDe\b/g, 'de').replace(/\bLa\b(?!s)/g, (m, o) => (o === 0 ? m : 'la'))
}

/** Etiquetas cortas para los servicios largos del catálogo. */
const CORTOS: Record<string, string> = {
  'APOYO ECONÓMICO PARA PERSONAS CON DISCAPACIDAD': 'Apoyo económico',
  'ESTRATEGIAS PARA LA INCLUSIÓN DE PERSONAS CON DISCAPACIDAD': 'Estrategias para la inclusión',
  'SER CAPAZ EN CASA': 'Ser Capaz en Casa',
  'ACCIONES DE PARTICIPACIÓN, GESTIÓN E INCIDENCIA PARA LA INCLUSIÓN SOCIAL DE LAS PERSONAS CUIDADORAS DE PERSONAS CON DISCAPACIDAD': 'Participación e incidencia (personas cuidadoras)',
  'ACCIONES DE PARTICIPACIÓN, GESTIÓN E INCIDENCIA PARA LA INCLUSIÓN SOCIAL DE LAS PERSONAS CON DISCAPACIDAD': 'Participación e incidencia (personas con discapacidad)',
  'FORMACIÓN Y APOYO A LA ECONOMÍA DEL CUIDADO DE PERSONAS CUIDADORAS DE PERSONAS CON DISCAPACIDAD': 'Economía del cuidado (cuidadoras)',
  'DESARROLLO Y PROMOCIÓN DE HABILIDADES PARA LA VIDA INDEPENDIENTE DE PERSONAS CON DISCAPACIDAD': 'Habilidades para la vida independiente',
  'ACOMPAÑAMIENTO PSICOSOCIAL A PERSONAS CON DISCAPACIDAD': 'Acompañamiento psicosocial (PcD)',
  'ATENCIÓN INTEGRAL A NNA CON DISCAPACIDAD INTELECTUAL': 'Atención integral a NNA con disc. intelectual',
  'FORMACIÓN EN EMPRENDIMIENTO PARA PERSONAS CUIDADORAS DE PERSONAS CON DISCAPACIDAD': 'Emprendimiento (cuidadoras)',
  'ACOMPAÑAMIENTO PSICOSOCIAL A PERSONAS CUIDADORAS DE PERSONAS CON DISCAPACIDAD': 'Acompañamiento psicosocial (cuidadoras)',
  'CAPACITACIÓN EN MANUALIDADES PARA PERSONAS CUIDADORAS DE PERSONAS CON DISCAPACIDAD': 'Manualidades (cuidadoras)',
  'FORTALECIMIENTO A LA RED DE APOYO DE CUIDADORES DE PERSONAS CON DISCAPACIDAD DEPENDIENTES Y SEMIDEPENDIENTES DE LA COMUNA 2': 'Red de apoyo de cuidadores (Comuna 2)',
  'AYUDAS TÉCNICAS PERSONAS CON DISCAPACIDAD': 'Ayudas técnicas',
  'VALORACIÓN DE APOYOS DE PERSONAS CON DISCAPACIDAD': 'Valoración de apoyos',
  'CAPACITACIÓN EN MANUALIDADES PARA PERSONAS CON DISCAPACIDAD': 'Manualidades (PcD)',
  'FORMACIÓN EN EMPRENDIMIENTO PARA PERSONAS CON DISCAPACIDAD': 'Emprendimiento (PcD)',
  'FORTALECIMIENTO AL COMITÉ COMUNAL DE INCLUSIÓN DE LA COMUNA 2': 'Comité comunal de inclusión (Comuna 2)',
  'CAPACITACIÓN Y FORTALECIMIENTO TÉCNICO AL COMITÉ COMUNAL DE INCLUSIÓN DE LA COMUNA 4': 'Comité comunal de inclusión (Comuna 4)',
}
export const servicioCorto = (s: string | null | undefined) => (s ? CORTOS[s] ?? oracion(s) : '(vacío)')
export const quitarDisc = (s: string | null | undefined) =>
  s ? oracion(s.replace(/^DISCAPACIDAD /, '')) : '(vacío)'

/** "13 SAN JAVIER" -> "13 San Javier"; "20 - FUERA DE MEDELLIN" -> "20 Fuera de Medellín" */
export function etiquetaComuna(t: string | null | undefined): string {
  if (!t) return '(vacío)'
  const n = t.match(/^\s*(\d+)/)?.[1]
  const nombre = nombreComuna(t).replace(/Medellin/i, 'Medellín')
  return n ? `${n} ${nombre}` : nombre
}
