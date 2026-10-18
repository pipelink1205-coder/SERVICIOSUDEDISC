"""Base SQLite: cortes, atenciones (sin datos personales), calidad, usuarios y auditoría."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager

from .config import DB_PATH

ESQUEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cortes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    anio            INTEGER NOT NULL,
    mes_corte       INTEGER NOT NULL,
    archivo         TEXT    NOT NULL,
    hash            TEXT    NOT NULL,
    origen          TEXT    NOT NULL,          -- 'web' | 'ruta'
    hoja            TEXT    NOT NULL,
    hojas_libro     TEXT    NOT NULL,          -- JSON con todas las hojas detectadas
    filas_leidas    INTEGER NOT NULL,
    filas_validas   INTEGER NOT NULL,
    filas_rechazadas INTEGER NOT NULL,
    personas        INTEGER NOT NULL,
    usuario         TEXT    NOT NULL,
    fecha_carga     TEXT    NOT NULL,
    nota            TEXT
);

CREATE TABLE IF NOT EXISTS atenciones (
    corte_id        INTEGER NOT NULL REFERENCES cortes(id) ON DELETE CASCADE,
    fila            INTEGER NOT NULL,          -- fila del Excel, para rastrear calidad
    mes             INTEGER NOT NULL,
    proyecto_cod    TEXT, proyecto TEXT,
    indicador_cod   TEXT, indicador TEXT,
    servicio        TEXT,
    persona         TEXT,                      -- código irreversible del documento
    tipo_doc        TEXT,
    sexo            TEXT,
    edad            INTEGER,
    rango_edad      TEXT,
    etnia           TEXT,
    discapacidad    TEXT,
    victima         TEXT,
    habitanza       TEXT,
    campesino       TEXT,
    escolaridad     TEXT,
    salud           TEXT,
    estrato         TEXT,
    area            TEXT,
    comuna_num      INTEGER,
    comuna          TEXT,
    barrio          TEXT,
    fecha_ingreso   TEXT,
    permanencia_meses INTEGER,
    nuevo           INTEGER,
    viene           INTEGER,
    pais            TEXT
);
CREATE INDEX IF NOT EXISTS ix_atenciones_corte ON atenciones(corte_id);

CREATE TABLE IF NOT EXISTS calidad (
    corte_id   INTEGER NOT NULL REFERENCES cortes(id) ON DELETE CASCADE,
    tipo       TEXT NOT NULL,      -- rechazo | vacio | sin_dato | variante | duplicado | fuera_mapa | inconsistencia
    campo      TEXT,
    valor      TEXT,
    filas      INTEGER NOT NULL,
    detalle    TEXT,
    ejemplo_filas TEXT              -- filas del Excel (máx. 20), nunca datos personales
);
CREATE INDEX IF NOT EXISTS ix_calidad_corte ON calidad(corte_id);

CREATE TABLE IF NOT EXISTS usuarios (
    usuario   TEXT PRIMARY KEY,
    nombre    TEXT NOT NULL,
    rol       TEXT NOT NULL CHECK (rol IN ('consulta','analista','admin')),
    clave     TEXT NOT NULL,
    activo    INTEGER NOT NULL DEFAULT 1,
    creado    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auditoria (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha    TEXT NOT NULL,
    usuario  TEXT,
    accion   TEXT NOT NULL,
    detalle  TEXT
);
"""


def conectar() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


@contextmanager
def conexion():
    con = conectar()
    try:
        yield con
        con.commit()
    finally:
        con.close()


def inicializar() -> None:
    with conexion() as con:
        con.executescript(ESQUEMA)
