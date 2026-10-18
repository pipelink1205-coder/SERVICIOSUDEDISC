"""Prueba de aceptación: el libro de diciembre 2025 debe reproducir los conteos conocidos.

Uso:  set EPI_LIBRO_SEMILLA=C:\\...\\Reporte PI diciembre_2025 Discapacidad.xlsm
      pytest -q
"""
import os
from pathlib import Path

import pytest

from app.analitica import motor
from app.ingesta.lector import leer_libro

SEMILLA = os.getenv("EPI_LIBRO_SEMILLA") or os.getenv("EPI_CARPETA_DATOS", "")
ruta = Path(SEMILLA)
if ruta.is_dir():
    candidatos = sorted(ruta.glob("*diciembre*2025*.xls*"))
    ruta = candidatos[0] if candidatos else ruta

pytestmark = pytest.mark.skipif(not ruta.is_file(), reason="Define EPI_LIBRO_SEMILLA con la ruta del libro 2025")


@pytest.fixture(scope="module")
def res():
    return leer_libro(ruta)


def test_hoja_y_periodo(res):
    assert res.hoja == "ESTAD. PERSONAS IND. PRODUCTO"
    assert (res.anio, res.mes_corte) == (2025, 12)


def test_filas_validas_y_basura(res):
    assert len(res.atenciones) == 15303
    rechazos = {q["valor"] for q in res.calidad if q["tipo"] == "rechazo"}
    assert {"IS41AD", "IS13AI", "CÓDIGO VALOR ESTADISTICO", "CÓDIGO Y NOMBRE DEL PROYECTO"} <= rechazos


def test_personas_distintas(res):
    assert res.atenciones["persona"].nunique() == 12032


def test_meses(res):
    m = res.atenciones["mes"].value_counts().to_dict()
    assert m == {8: 4537, 10: 2555, 6: 2164, 3: 1899, 9: 1467, 7: 863, 11: 820, 12: 613, 5: 333, 2: 52}


def test_sexo(res):
    assert res.atenciones["sexo"].value_counts().to_dict() == {
        "MUJER": 8047, "HOMBRE": 7228, "INDEFINIDO": 20, "INTERSEXUAL": 8}


def test_servicios_e_indicadores(res):
    s = res.atenciones["servicio"].value_counts()
    assert s["APOYO ECONÓMICO PARA PERSONAS CON DISCAPACIDAD"] == 5693
    assert s["ESTRATEGIAS PARA LA INCLUSIÓN DE PERSONAS CON DISCAPACIDAD"] == 4950
    assert s["VALORACIÓN DE APOYOS DE PERSONAS CON DISCAPACIDAD"] == 40
    assert res.atenciones["indicador_cod"].value_counts().to_dict() == {
        "2.2.5.1": 8741, "2.2.5.2": 4990, "2.2.5.3": 1572}


def test_territorio(res):
    c = res.atenciones["comuna"].value_counts()
    assert c.index[0] == "13 SAN JAVIER" and c.iloc[0] == 1541
    assert res.atenciones["comuna_num"].nunique() == 22


def test_no_guarda_datos_personales(res):
    prohibidas = {"documento", "nombre", "apellido", "direccion", "fecha_nacimiento", "observaciones",
                  "orientacion", "identidad_genero"}
    assert not prohibidas & set(res.atenciones.columns)


def test_filtro_cruzado_es_real(res):
    df = res.atenciones.copy()
    a = motor.filtrar(df, {"sexo": ["MUJER"], "comuna": ["13"]})
    real = ((df["sexo"] == "MUJER") & (df["comuna_num"] == 13)).sum()
    assert len(a) == real
    b = motor.filtrar(df, {"mes": ["8"], "servicio": ["APOYO ECONÓMICO PARA PERSONAS CON DISCAPACIDAD"]})
    assert len(b) == ((df["mes"] == 8) & (df["servicio"] == "APOYO ECONÓMICO PARA PERSONAS CON DISCAPACIDAD")).sum()
