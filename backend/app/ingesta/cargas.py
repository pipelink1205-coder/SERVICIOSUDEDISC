"""Registro de cortes: cada libro cargado queda como un corte con su calidad."""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

from ..config import ARCHIVOS_DIR
from ..db import conexion
from .lector import ErrorLectura, hash_archivo, leer_libro


def registrar_corte(ruta: Path, nombre: str, origen: str, usuario: str,
                    anio: int | None = None, mes_corte: int | None = None,
                    reemplazar: bool = False, nota: str | None = None) -> dict:
    ruta = Path(ruta)
    huella = hash_archivo(ruta)

    with conexion() as con:
        previo = con.execute("SELECT id, archivo, fecha_carga FROM cortes WHERE hash = ?", (huella,)).fetchone()
    if previo and not reemplazar:
        raise ErrorLectura(
            f"Este mismo archivo ya se cargó el {previo['fecha_carga'][:16].replace('T', ' ')} "
            f"como corte #{previo['id']} ({previo['archivo']}). Marca «Reemplazar» si quieres volver a procesarlo."
        )

    res = leer_libro(ruta, nombre)
    anio = anio or res.anio
    mes_corte = mes_corte or res.mes_corte
    if not anio or not mes_corte:
        raise ErrorLectura("No se pudo deducir el año y el mes de corte. Indícalos en el formulario.")

    df = res.atenciones
    personas = int(df["persona"].nunique())
    ahora = datetime.now().isoformat(timespec="seconds")

    with conexion() as con:
        if previo and reemplazar:
            con.execute("DELETE FROM cortes WHERE id = ?", (previo["id"],))
        # un solo corte vigente por año+mes: el nuevo reemplaza al anterior
        con.execute("DELETE FROM cortes WHERE anio = ? AND mes_corte = ?", (anio, mes_corte))
        cur = con.execute(
            """INSERT INTO cortes (anio, mes_corte, archivo, hash, origen, hoja, hojas_libro, filas_leidas,
                                   filas_validas, filas_rechazadas, personas, usuario, fecha_carga, nota)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (anio, mes_corte, nombre, huella, origen, res.hoja, json.dumps(res.hojas_libro, ensure_ascii=False),
             res.filas_leidas, len(df), res.filas_leidas - len(df), personas, usuario, ahora, nota),
        )
        corte_id = cur.lastrowid
        registros = df.assign(corte_id=corte_id)
        registros = registros.astype(object).where(registros.notna(), None)
        cols = ["corte_id"] + [c for c in df.columns]
        con.executemany(
            f"INSERT INTO atenciones ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
            registros[cols].itertuples(index=False, name=None),
        )
        con.executemany(
            "INSERT INTO calidad (corte_id, tipo, campo, valor, filas, detalle, ejemplo_filas) VALUES (?,?,?,?,?,?,?)",
            [(corte_id, q["tipo"], q["campo"], q["valor"], q["filas"], q["detalle"], q["ejemplo_filas"])
             for q in res.calidad],
        )

    # copia privada del libro (fuera del repositorio) para reprocesar si hace falta
    destino = ARCHIVOS_DIR / f"{anio}-{mes_corte:02d}_{huella[:8]}{ruta.suffix.lower()}"
    if not destino.exists():
        try:
            shutil.copyfile(ruta, destino)
        except OSError:
            pass

    return {"id": corte_id, "anio": anio, "mes_corte": mes_corte, "archivo": nombre, "hoja": res.hoja,
            "hojas_libro": res.hojas_libro, "filas_leidas": res.filas_leidas, "filas_validas": len(df),
            "filas_rechazadas": res.filas_leidas - len(df), "personas": personas,
            "hallazgos_calidad": len(res.calidad)}


def archivos_en_ruta(ruta: str) -> list[Path]:
    p = Path(ruta.strip().strip('"'))
    if p.is_file():
        return [p]
    if p.is_dir():
        return sorted([*p.glob("*.xlsx"), *p.glob("*.xlsm")], key=lambda x: x.stat().st_mtime)
    raise ErrorLectura(f"La ruta no existe o no es accesible desde el servidor: {p}")
