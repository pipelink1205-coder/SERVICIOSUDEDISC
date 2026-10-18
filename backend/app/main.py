"""API de Analítica de Datos EPI — Unidad de Discapacidad."""
from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config
from .analitica import motor
from .auth import (NIVEL, asegurar_admin, auditar, cifrar_clave, emitir_token, requiere, usuario_actual,
                   verificar_clave)
from .db import conexion, inicializar
from .exportar import libro_agregados
from .ingesta.cargas import archivos_en_ruta, registrar_corte
from .ingesta.lector import MESES, ErrorLectura

app = FastAPI(title="Analítica de Datos EPI", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _inicio() -> None:
    inicializar()
    asegurar_admin()


@app.exception_handler(ErrorLectura)
def _error_lectura(_: Request, exc: ErrorLectura):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


# ---------------------------------------------------------------------------
# utilidades
def _filtros(request: Request, u: dict) -> dict[str, list[str]]:
    f: dict[str, list[str]] = {}
    for k, v in request.query_params.multi_items():
        if k in motor.FILTROS and v != "":
            if k in motor.SENSIBLES and u["rol"] != "admin":
                continue
            f.setdefault(k, []).append(v)
    return f


def _corte(corte_id: int | None) -> dict:
    with conexion() as con:
        if corte_id:
            fila = con.execute("SELECT * FROM cortes WHERE id = ?", (corte_id,)).fetchone()
        else:
            fila = con.execute("SELECT * FROM cortes ORDER BY anio DESC, mes_corte DESC, id DESC LIMIT 1").fetchone()
    if not fila:
        raise HTTPException(404, "Todavía no hay cortes cargados. Ve a Cargas y sube el libro del mes.")
    c = dict(fila)
    c["hojas_libro"] = json.loads(c["hojas_libro"])
    c["etiqueta"] = f"{MESES[c['mes_corte'] - 1].capitalize()} {c['anio']}"
    return c


# ---------------------------------------------------------------------------
# sesión
class Login(BaseModel):
    usuario: str
    clave: str


@app.post("/api/auth/login")
def login(datos: Login):
    with conexion() as con:
        fila = con.execute("SELECT * FROM usuarios WHERE usuario = ? AND activo = 1",
                           (datos.usuario.strip().lower(),)).fetchone()
    if not fila or not verificar_clave(datos.clave, fila["clave"]):
        auditar(datos.usuario, "login_fallido")
        raise HTTPException(401, "Usuario o clave incorrectos.")
    u = dict(fila)
    auditar(u["usuario"], "login")
    return {"token": emitir_token(u), "usuario": {"usuario": u["usuario"], "nombre": u["nombre"], "rol": u["rol"]}}


@app.get("/api/auth/yo")
def yo(u: dict = Depends(usuario_actual)):
    return u


class CambioClave(BaseModel):
    actual: str
    nueva: str


@app.post("/api/auth/clave")
def cambiar_clave(datos: CambioClave, u: dict = Depends(usuario_actual)):
    with conexion() as con:
        fila = con.execute("SELECT clave FROM usuarios WHERE usuario = ?", (u["usuario"],)).fetchone()
        if not verificar_clave(datos.actual, fila["clave"]):
            raise HTTPException(400, "La clave actual no coincide.")
        if len(datos.nueva) < 8:
            raise HTTPException(400, "La nueva clave debe tener al menos 8 caracteres.")
        con.execute("UPDATE usuarios SET clave = ? WHERE usuario = ?", (cifrar_clave(datos.nueva), u["usuario"]))
    auditar(u["usuario"], "cambio_clave")
    return {"ok": True}


# ---------------------------------------------------------------------------
# cortes
@app.get("/api/salud")
def salud():
    return {"ok": True}


@app.get("/api/cortes")
def listar_cortes(u: dict = Depends(usuario_actual)):
    with conexion() as con:
        filas = con.execute("SELECT * FROM cortes ORDER BY anio DESC, mes_corte DESC").fetchall()
    salida = []
    for f in filas:
        c = dict(f)
        c["hojas_libro"] = json.loads(c["hojas_libro"])
        c["etiqueta"] = f"{MESES[c['mes_corte'] - 1].capitalize()} {c['anio']}"
        c.pop("hash", None)
        salida.append(c)
    return {"cortes": salida, "carpeta_defecto": config.CARPETA_DATOS}


@app.post("/api/cortes/subir")
def subir_corte(archivo: UploadFile = File(...), anio: int | None = Form(None), mes_corte: int | None = Form(None),
                reemplazar: bool = Form(False), nota: str | None = Form(None), u: dict = Depends(requiere("analista"))):
    sufijo = Path(archivo.filename or "").suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=sufijo) as tmp:
        shutil.copyfileobj(archivo.file, tmp)
        ruta = Path(tmp.name)
    try:
        r = registrar_corte(ruta, archivo.filename or ruta.name, "web", u["usuario"], anio, mes_corte, reemplazar, nota)
    finally:
        ruta.unlink(missing_ok=True)
    motor.invalidar()
    auditar(u["usuario"], "carga_web", f"{r['archivo']} -> corte {r['id']}")
    return r


class CargaRuta(BaseModel):
    ruta: str
    anio: int | None = None
    mes_corte: int | None = None
    reemplazar: bool = False


@app.post("/api/cortes/ruta")
def cargar_ruta(datos: CargaRuta, u: dict = Depends(requiere("analista"))):
    resultados, errores = [], []
    for archivo in archivos_en_ruta(datos.ruta):
        try:
            resultados.append(registrar_corte(archivo, archivo.name, "ruta", u["usuario"], datos.anio,
                                              datos.mes_corte, datos.reemplazar))
        except ErrorLectura as e:
            errores.append({"archivo": archivo.name, "error": str(e)})
    motor.invalidar()
    auditar(u["usuario"], "carga_ruta", f"{datos.ruta}: {len(resultados)} ok, {len(errores)} con error")
    if not resultados and errores:
        raise HTTPException(422, errores[0]["error"])
    return {"cargados": resultados, "errores": errores}


@app.delete("/api/cortes/{corte_id}")
def borrar_corte(corte_id: int, u: dict = Depends(requiere("admin"))):
    with conexion() as con:
        con.execute("DELETE FROM cortes WHERE id = ?", (corte_id,))
    motor.invalidar(corte_id)
    auditar(u["usuario"], "borrar_corte", str(corte_id))
    return {"ok": True}


@app.get("/api/cortes/{corte_id}/calidad")
def calidad(corte_id: int, u: dict = Depends(requiere("analista"))):
    c = _corte(corte_id)
    with conexion() as con:
        filas = [dict(f) for f in con.execute(
            "SELECT tipo, campo, valor, filas, detalle, ejemplo_filas FROM calidad WHERE corte_id = ? "
            "ORDER BY CASE tipo WHEN 'rechazo' THEN 0 WHEN 'duplicado' THEN 1 WHEN 'inconsistencia' THEN 2 "
            "WHEN 'variante' THEN 3 WHEN 'fuera_mapa' THEN 4 WHEN 'vacio' THEN 5 ELSE 6 END, filas DESC",
            (corte_id,)).fetchall()]
    return {"corte": c, "hallazgos": filas}


# ---------------------------------------------------------------------------
# analítica
@app.get("/api/opciones")
def opciones(corte: int | None = None, u: dict = Depends(usuario_actual)):
    c = _corte(corte)
    return {"corte": c, "opciones": motor.opciones(motor.datos(c["id"]), u["rol"] == "admin")}


@app.get("/api/tablero")
def tablero(request: Request, corte: int | None = None, u: dict = Depends(usuario_actual)):
    c = _corte(corte)
    t = motor.tablero(motor.datos(c["id"]), _filtros(request, u), u["rol"] == "admin")
    t["corte"] = c
    return t


@app.get("/api/vulnerabilidad")
def vulnerabilidad(request: Request, corte: int | None = None, u: dict = Depends(requiere("admin"))):
    c = _corte(corte)
    auditar(u["usuario"], "ver_vulnerabilidad", f"corte {c['id']}")
    r = motor.vulnerabilidad(motor.datos(c["id"]), _filtros(request, u))
    r["corte"] = c
    return r


@app.get("/api/comparar")
def comparar(request: Request, a: int, b: int, u: dict = Depends(usuario_actual)):
    ca, cb = _corte(a), _corte(b)
    r = motor.comparar(motor.datos(ca["id"]), motor.datos(cb["id"]), _filtros(request, u))
    r["a"], r["b"] = ca, cb
    return r


@app.get("/api/exportar")
def exportar(request: Request, corte: int | None = None, u: dict = Depends(usuario_actual)):
    c = _corte(corte)
    filtros = _filtros(request, u)
    filtros.pop("victima", None)
    t = motor.tablero(motor.datos(c["id"]), filtros, False)
    txt = "; ".join(f"{k}={','.join(v)}" for k, v in filtros.items())
    contenido = libro_agregados(t, c, txt)
    auditar(u["usuario"], "exportar", txt)
    nombre = f"Analitica_EPI_{c['anio']}-{c['mes_corte']:02d}.xlsx"
    return Response(contenido, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{nombre}"'})


# ---------------------------------------------------------------------------
# administración
@app.get("/api/admin/usuarios")
def usuarios(u: dict = Depends(requiere("admin"))):
    with conexion() as con:
        return [dict(f) for f in con.execute(
            "SELECT usuario, nombre, rol, activo, creado FROM usuarios ORDER BY usuario").fetchall()]


class NuevoUsuario(BaseModel):
    usuario: str
    nombre: str
    rol: str
    clave: str | None = None
    activo: bool = True


@app.post("/api/admin/usuarios")
def guardar_usuario(datos: NuevoUsuario, u: dict = Depends(requiere("admin"))):
    if datos.rol not in NIVEL:
        raise HTTPException(400, "Rol no válido.")
    usuario = datos.usuario.strip().lower()
    from datetime import datetime
    with conexion() as con:
        existe = con.execute("SELECT 1 FROM usuarios WHERE usuario = ?", (usuario,)).fetchone()
        if existe:
            con.execute("UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE usuario = ?",
                        (datos.nombre, datos.rol, int(datos.activo), usuario))
            if datos.clave:
                con.execute("UPDATE usuarios SET clave = ? WHERE usuario = ?", (cifrar_clave(datos.clave), usuario))
        else:
            if not datos.clave or len(datos.clave) < 8:
                raise HTTPException(400, "La clave inicial debe tener al menos 8 caracteres.")
            con.execute("INSERT INTO usuarios (usuario, nombre, rol, clave, activo, creado) VALUES (?,?,?,?,?,?)",
                        (usuario, datos.nombre, datos.rol, cifrar_clave(datos.clave), int(datos.activo),
                         datetime.now().isoformat(timespec="seconds")))
    auditar(u["usuario"], "guardar_usuario", f"{usuario} ({datos.rol})")
    return {"ok": True}


@app.get("/api/admin/auditoria")
def auditoria(u: dict = Depends(requiere("admin"))):
    with conexion() as con:
        return [dict(f) for f in con.execute("SELECT * FROM auditoria ORDER BY id DESC LIMIT 300").fetchall()]


# ---------------------------------------------------------------------------
# interfaz compilada (npm run build) servida desde el mismo puerto
if config.FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=config.FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{ruta:path}", include_in_schema=False)
    def spa(ruta: str):
        archivo = config.FRONTEND_DIST / ruta
        if ruta and archivo.is_file():
            return FileResponse(archivo)
        return FileResponse(config.FRONTEND_DIST / "index.html")
