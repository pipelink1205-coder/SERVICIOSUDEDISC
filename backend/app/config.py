"""Configuración central del aplicativo.

Todo lo que cambia entre equipos (rutas, claves, puertos) se lee de variables de
entorno o del archivo backend/.env. Los valores por defecto sirven para correr en
el equipo de la analista sin configurar nada.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
RAIZ = BASE_DIR.parent                                       # ANALITICA DISCAPACIDAD/


def _cargar_env() -> None:
    """Lee backend/.env (formato CLAVE=valor) sin depender de librerías externas."""
    archivo = BASE_DIR / ".env"
    if not archivo.exists():
        return
    for linea in archivo.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip('"').strip("'"))


_cargar_env()

DATA_DIR = Path(os.getenv("EPI_DATA_DIR", RAIZ / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVOS_DIR = DATA_DIR / "archivos"          # copia privada de los libros cargados
ARCHIVOS_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(os.getenv("EPI_DB", DATA_DIR / "analitica.db"))

# Ruta local por defecto para "Leer desde carpeta" (archivo o carpeta).
CARPETA_DATOS = os.getenv("EPI_CARPETA_DATOS", "")

# Hoja prioritaria y variantes aceptadas del nombre.
HOJA_PRODUCTO = ["ESTAD. PERSONAS IND. PRODUCTO", "ESTAD PERSONAS IND PRODUCTO"]


def _secreto(nombre: str) -> str:
    """Genera y persiste un secreto local la primera vez (no va al repositorio)."""
    valor = os.getenv(nombre)
    if valor:
        return valor
    archivo = DATA_DIR / f".{nombre.lower()}"
    if archivo.exists():
        return archivo.read_text().strip()
    valor = secrets.token_hex(32)
    archivo.write_text(valor)
    return valor


# Sal para convertir el documento de identidad en un código irreversible.
# Si se pierde, los cortes viejos y nuevos dejan de ser comparables por persona.
SAL_DOCUMENTO = _secreto("EPI_SAL_DOCUMENTO")
JWT_SECRETO = _secreto("EPI_JWT_SECRETO")
JWT_HORAS = int(os.getenv("EPI_JWT_HORAS", "12"))

ADMIN_USUARIO = os.getenv("EPI_ADMIN_USUARIO", "admin")
ADMIN_CLAVE = os.getenv("EPI_ADMIN_CLAVE", "Discapacidad2026*")

PUERTO = int(os.getenv("EPI_PUERTO", "8020"))
FRONTEND_DIST = RAIZ / "frontend" / "dist"
