"""Usuarios locales, roles y auditoría.

Roles:
- consulta: ve los tableros.
- analista: además carga cortes y revisa calidad del dato.
- admin:    además ve Vulnerabilidad y administra usuarios.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request

from .config import ADMIN_CLAVE, ADMIN_USUARIO, JWT_HORAS, JWT_SECRETO
from .db import conexion

NIVEL = {"consulta": 1, "analista": 2, "admin": 3}


def cifrar_clave(clave: str, sal: bytes | None = None) -> str:
    sal = sal or os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal, 240_000)
    return f"pbkdf2${sal.hex()}${h.hex()}"


def verificar_clave(clave: str, guardada: str) -> bool:
    try:
        _, sal, h = guardada.split("$")
    except ValueError:
        return False
    calc = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal), 240_000).hex()
    return hmac.compare_digest(calc, h)


def asegurar_admin() -> None:
    with conexion() as con:
        hay = con.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]
        if not hay:
            con.execute("INSERT INTO usuarios (usuario, nombre, rol, clave, creado) VALUES (?,?,?,?,?)",
                        (ADMIN_USUARIO, "Administrador", "admin", cifrar_clave(ADMIN_CLAVE),
                         datetime.now().isoformat(timespec="seconds")))


def auditar(usuario: str | None, accion: str, detalle: str = "") -> None:
    with conexion() as con:
        con.execute("INSERT INTO auditoria (fecha, usuario, accion, detalle) VALUES (?,?,?,?)",
                    (datetime.now().isoformat(timespec="seconds"), usuario, accion, detalle[:500]))


def emitir_token(usuario: dict) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_HORAS)
    return jwt.encode({"sub": usuario["usuario"], "rol": usuario["rol"], "nombre": usuario["nombre"],
                       "exp": exp}, JWT_SECRETO, algorithm="HS256")


def usuario_actual(request: Request) -> dict:
    cab = request.headers.get("Authorization", "")
    token = cab[7:] if cab.lower().startswith("bearer ") else request.query_params.get("token", "")
    if not token:
        raise HTTPException(401, "Inicia sesión para continuar.")
    try:
        datos = jwt.decode(token, JWT_SECRETO, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "La sesión venció. Vuelve a iniciar sesión.")
    except jwt.PyJWTError:
        raise HTTPException(401, "Sesión no válida.")
    with conexion() as con:
        fila = con.execute("SELECT usuario, nombre, rol, activo FROM usuarios WHERE usuario = ?",
                           (datos["sub"],)).fetchone()
    if not fila or not fila["activo"]:
        raise HTTPException(401, "El usuario no existe o está inactivo.")
    return dict(fila)


def requiere(rol: str):
    def _dep(u: dict = Depends(usuario_actual)) -> dict:
        if NIVEL[u["rol"]] < NIVEL[rol]:
            raise HTTPException(403, f"Esta sección requiere rol {rol}.")
        return u
    return _dep
