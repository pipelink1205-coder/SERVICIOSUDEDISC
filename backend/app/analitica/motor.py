"""Cálculos del tablero.

Cada número sale de filtrar filas reales y contar; nunca de proporciones estimadas.
- Atención: una fila válida de la hoja de producto.
- Persona: un código de documento distinto dentro del filtro activo.
"""
from __future__ import annotations

import threading
from typing import Iterable

import pandas as pd

from ..db import conectar
from ..ingesta.lector import MESES, RANGOS_EDAD, TERRITORIOS_MAPA

_cache: dict[int, pd.DataFrame] = {}
_lock = threading.Lock()

# filtro de la URL -> columna
FILTROS = {
    "mes": "mes", "proyecto": "proyecto_cod", "indicador": "indicador_cod", "servicio": "servicio",
    "sexo": "sexo", "discapacidad": "discapacidad", "estrato": "estrato", "comuna": "comuna_num",
    "area": "area", "edad": "rango_edad", "escolaridad": "escolaridad", "salud": "salud",
    "etnia": "etnia", "pais": "pais", "victima": "victima",
}
NUMERICOS = {"mes", "comuna_num"}
SENSIBLES = {"victima"}

DIMENSIONES_TABLERO = ["servicio", "indicador_cod", "proyecto_cod", "sexo", "discapacidad", "estrato",
                       "escolaridad", "salud", "etnia", "pais", "area", "tipo_doc", "habitanza",
                       "campesino"]


def invalidar(corte_id: int | None = None) -> None:
    with _lock:
        if corte_id is None:
            _cache.clear()
        else:
            _cache.pop(corte_id, None)


def datos(corte_id: int) -> pd.DataFrame:
    with _lock:
        if corte_id in _cache:
            return _cache[corte_id]
    con = conectar()
    try:
        df = pd.read_sql_query("SELECT * FROM atenciones WHERE corte_id = ?", con, params=(corte_id,))
    finally:
        con.close()
    df["comuna_num"] = pd.to_numeric(df["comuna_num"], errors="coerce").astype("Int64")
    df["edad"] = pd.to_numeric(df["edad"], errors="coerce")
    with _lock:
        _cache[corte_id] = df
    return df


# ---------------------------------------------------------------------------
def filtrar(df: pd.DataFrame, filtros: dict[str, list[str]], excluir: Iterable[str] = ()) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index)
    for clave, valores in filtros.items():
        if clave in excluir or clave not in FILTROS or not valores:
            continue
        col = FILTROS[clave]
        if col in NUMERICOS:
            vals = [int(v) for v in valores if str(v).lstrip("-").isdigit()]
        else:
            vals = [str(v) for v in valores]
        mask &= df[col].isin(vals)
    return df[mask]


def _conteo(df: pd.DataFrame, col: str, limite: int | None = None) -> list[dict]:
    if not len(df):
        return []
    g = df.groupby(col, dropna=False).agg(atenciones=("fila", "size"), personas=("persona", "nunique"))
    g = g.sort_values("atenciones", ascending=False)
    salida = []
    for valor, fila in g.iterrows():
        v = None if pd.isna(valor) else valor
        salida.append({"valor": v if not hasattr(v, "item") else v.item(),
                       "atenciones": int(fila.atenciones), "personas": int(fila.personas)})
    return salida[:limite] if limite else salida


def _personas(df: pd.DataFrame) -> int:
    return int(df["persona"].nunique())


def kpis(df: pd.DataFrame, incluir_sensibles: bool = False) -> dict:
    por_persona = df.dropna(subset=["persona"]).drop_duplicates("persona")
    edad = por_persona["edad"].dropna()
    k = {
        "atenciones": int(len(df)),
        "personas": _personas(df),
        "atenciones_sin_documento": int(df["persona"].isna().sum()),
        "mujeres": {"atenciones": int((df["sexo"] == "MUJER").sum()),
                    "personas": _personas(df[df["sexo"] == "MUJER"])},
        "hombres": {"atenciones": int((df["sexo"] == "HOMBRE").sum()),
                    "personas": _personas(df[df["sexo"] == "HOMBRE"])},
        "otro_sexo": {"atenciones": int((~df["sexo"].isin(["MUJER", "HOMBRE"])).sum()),
                      "personas": _personas(df[~df["sexo"].isin(["MUJER", "HOMBRE"])])},
        "edad_promedio": round(float(edad.mean()), 1) if len(edad) else None,
        "edad_mediana": float(edad.median()) if len(edad) else None,
        "menores_18": int((edad < 18).sum()),
        "mayores_60": int((edad >= 60).sum()),
        "urbana": {"atenciones": int((df["area"] == "URBANA").sum()),
                   "personas": _personas(df[df["area"] == "URBANA"])},
        "rural": {"atenciones": int((df["area"] == "RURAL").sum()),
                  "personas": _personas(df[df["area"] == "RURAL"])},
        "nuevos": int(df["nuevo"].fillna(0).astype(int).sum()),
        "vienen": int(df["viene"].fillna(0).astype(int).sum()),
        "servicios_activos": int(df["servicio"].nunique()),
        "territorios": int(df["comuna"].nunique()),
        "meses_con_reporte": int(df["mes"].nunique()),
        "con_discapacidad": _personas(df[df["discapacidad"].fillna("").str.startswith("DISCAPACIDAD")
                                        | df["discapacidad"].isin(["SORDOCEGUERA", "SI, SE DESCONOCE"])]),
    }
    if incluir_sensibles:
        vict = df["victima"].notna() & ~df["victima"].isin(["NINGUNA", "SIN DATO"])
        k["victimas"] = {"atenciones": int(vict.sum()), "personas": _personas(df[vict])}
    return k


def serie_mensual(df: pd.DataFrame) -> list[dict]:
    salida = []
    vistos: set[str] = set()
    for m in range(1, 13):
        sub = df[df["mes"] == m]
        pers = set(sub["persona"].dropna())
        nuevas = pers - vistos
        vistos |= pers
        salida.append({"mes": m, "nombre": MESES[m - 1].capitalize(), "atenciones": int(len(sub)),
                       "personas": len(pers), "personas_primera_vez": len(nuevas)})
    return salida


def piramide(df: pd.DataFrame) -> list[dict]:
    p = df.dropna(subset=["persona"]).drop_duplicates("persona")
    salida = []
    for r in RANGOS_EDAD:
        sub = p[p["rango_edad"] == r]
        salida.append({"rango": r, "hombres": int((sub["sexo"] == "HOMBRE").sum()),
                       "mujeres": int((sub["sexo"] == "MUJER").sum()),
                       "otro": int((~sub["sexo"].isin(["HOMBRE", "MUJER"])).sum())})
    return salida


def territorio(df: pd.DataFrame) -> dict:
    filas = []
    sin_mapa = []
    if len(df):
        g = df.groupby(["comuna_num", "comuna"], dropna=False).agg(
            atenciones=("fila", "size"), personas=("persona", "nunique")).reset_index()
        for _, r in g.iterrows():
            num = None if pd.isna(r["comuna_num"]) else int(r["comuna_num"])
            item = {"numero": num, "nombre": r["comuna"] if not pd.isna(r["comuna"]) else "(vacío)",
                    "atenciones": int(r["atenciones"]), "personas": int(r["personas"])}
            (filas if num in TERRITORIOS_MAPA else sin_mapa).append(item)
    filas.sort(key=lambda x: -x["atenciones"])
    return {"territorios": filas, "sin_mapa": sin_mapa}


def matriz(df: pd.DataFrame, filas: str, columnas: str, limite_filas: int | None = None) -> dict:
    if not len(df):
        return {"filas": [], "columnas": [], "valores": []}
    t = pd.crosstab(df[filas].fillna("(vacío)"), df[columnas].fillna("(vacío)"))
    t = t.loc[t.sum(axis=1).sort_values(ascending=False).index]
    if limite_filas:
        t = t.head(limite_filas)
    cols = [c.item() if hasattr(c, "item") else c for c in t.columns]
    return {"filas": [f.item() if hasattr(f, "item") else f for f in t.index], "columnas": cols,
            "valores": t.astype(int).values.tolist()}


CLAVE_DE_COLUMNA = {v: k for k, v in FILTROS.items()}


def tablero(df_corte: pd.DataFrame, filtros: dict, incluir_sensibles: bool) -> dict:
    """KPIs con todos los filtros; cada desglose ignora su propio filtro (filtro cruzado),
    para que lo seleccionado se vea resaltado frente a las demás opciones."""
    df = filtrar(df_corte, filtros)

    def sin(*claves):
        return filtrar(df_corte, filtros, excluir=claves) if any(c in filtros for c in claves) else df

    dims = {}
    for d in DIMENSIONES_TABLERO:
        dims[d] = _conteo(sin(CLAVE_DE_COLUMNA.get(d, "")), d)
    dims["rango_edad"] = sorted(_conteo(sin("edad"), "rango_edad"),
                                key=lambda x: RANGOS_EDAD.index(x["valor"]) if x["valor"] in RANGOS_EDAD else 99)
    base_serv = sin("servicio")
    serv_ind = base_serv.groupby("servicio")["indicador_cod"].agg(lambda s: s.mode().iat[0] if len(s.mode()) else None)
    for item in dims["servicio"]:
        item["indicador"] = serv_ind.get(item["valor"]) if item["valor"] is not None else None
    ind_nombre = df_corte.groupby("indicador_cod")["indicador"].first()
    for item in dims["indicador_cod"]:
        item["nombre"] = ind_nombre.get(item["valor"]) if item["valor"] is not None else None
    proy_nombre = df_corte.groupby("proyecto_cod")["proyecto"].first()
    for item in dims["proyecto_cod"]:
        item["nombre"] = proy_nombre.get(item["valor"]) if item["valor"] is not None else None
    if incluir_sensibles:
        dims["victima"] = _conteo(sin("victima"), "victima")
    return {
        "kpis": kpis(df, incluir_sensibles),
        "universo": {"atenciones": int(len(df_corte)), "personas": _personas(df_corte)},
        "dimensiones": dims,
        "serie": serie_mensual(sin("mes")),
        "piramide": piramide(sin("edad")),
        "territorio": territorio(sin("comuna")),
        "barrios": _conteo(df, "barrio", 25),
        "matriz_mes_comuna": matriz(sin("comuna", "mes"), "comuna", "mes"),
        "matriz_servicio_mes": matriz(sin("servicio", "mes"), "servicio", "mes"),
        "matriz_discapacidad_sexo": matriz(sin("discapacidad", "sexo"), "discapacidad", "sexo"),
    }


def opciones(df: pd.DataFrame, incluir_sensibles: bool) -> dict:
    def vals(col, orden=None):
        c = df[col].dropna().value_counts()
        items = [{"valor": (k.item() if hasattr(k, "item") else k), "n": int(v)} for k, v in c.items()]
        if orden:
            items.sort(key=orden)
        return items

    o = {
        "mes": [{"valor": int(m), "n": int((df["mes"] == m).sum()), "nombre": MESES[int(m) - 1].capitalize()}
                for m in sorted(df["mes"].dropna().unique().astype(int))],
        "proyecto": vals("proyecto_cod"), "indicador": vals("indicador_cod"),
        "servicio": vals("servicio"), "sexo": vals("sexo"), "discapacidad": vals("discapacidad"),
        "estrato": vals("estrato", lambda x: x["valor"]), "area": vals("area"),
        "edad": vals("rango_edad", lambda x: RANGOS_EDAD.index(x["valor"]) if x["valor"] in RANGOS_EDAD else 99),
        "escolaridad": vals("escolaridad"), "salud": vals("salud"), "etnia": vals("etnia"), "pais": vals("pais"),
        "comuna": [{"valor": int(n), "nombre": g["comuna"].iloc[0], "n": int(len(g))}
                   for n, g in df.dropna(subset=["comuna_num"]).groupby("comuna_num")],
    }
    ind = df.groupby("indicador_cod")["indicador"].first()
    for i in o["indicador"]:
        i["nombre"] = ind.get(i["valor"])
    proy = df.groupby("proyecto_cod")["proyecto"].first()
    for p in o["proyecto"]:
        p["nombre"] = proy.get(p["valor"])
    if incluir_sensibles:
        o["victima"] = vals("victima")
    return o


def vulnerabilidad(df_corte: pd.DataFrame, filtros: dict) -> dict:
    df = filtrar(df_corte, filtros)
    vict = df[df["victima"].notna() & ~df["victima"].isin(["NINGUNA", "SIN DATO"])]
    return {
        "atenciones": int(len(df)), "personas": _personas(df),
        "victimas": {"atenciones": int(len(vict)), "personas": _personas(vict)},
        "sin_dato": int((df["victima"] == "SIN DATO").sum()),
        "hecho": _conteo(vict, "victima"),
        "discapacidad": _conteo(vict, "discapacidad"),
        "territorio": territorio(vict),
        "servicio": _conteo(vict, "servicio"),
        "habitanza": _conteo(df[df["habitanza"].notna() & ~df["habitanza"].isin(["NINGUNA", "SIN DATO"])],
                             "habitanza"),
    }


def comparar(df_a: pd.DataFrame, df_b: pd.DataFrame, filtros: dict) -> dict:
    a, b = filtrar(df_a, filtros), filtrar(df_b, filtros)

    def tabla(col):
        ga = a.groupby(col).size()
        gb = b.groupby(col).size()
        idx = sorted(set(ga.index) | set(gb.index), key=lambda k: -(gb.get(k, 0)))
        return [{"valor": (k.item() if hasattr(k, "item") else k), "a": int(ga.get(k, 0)), "b": int(gb.get(k, 0)),
                 "delta": int(gb.get(k, 0) - ga.get(k, 0))} for k in idx]

    pa, pb = set(a["persona"].dropna()), set(b["persona"].dropna())
    return {
        "totales": {"a": {"atenciones": len(a), "personas": len(pa)},
                    "b": {"atenciones": len(b), "personas": len(pb)}},
        "personas_solo_b": len(pb - pa), "personas_solo_a": len(pa - pb),
        "mes": tabla("mes"), "servicio": tabla("servicio"), "comuna": tabla("comuna"),
    }
