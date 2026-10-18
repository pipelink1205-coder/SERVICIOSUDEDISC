import { useSesion } from '../store/sesion'

export class ErrorApi extends Error {
  status: number
  constructor(status: number, msg: string) {
    super(msg)
    this.status = status
  }
}

export async function api<T = any>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = useSesion.getState().token
  const headers = new Headers(opciones.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (opciones.body && !(opciones.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const r = await fetch(ruta, { ...opciones, headers })
  if (r.status === 401) {
    useSesion.getState().salir()
  }
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try {
      const j = await r.json()
      msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {}
    throw new ErrorApi(r.status, msg)
  }
  return r.json()
}

export function query(params: Record<string, string[] | string | number | undefined | null>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)))
    else q.append(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}
