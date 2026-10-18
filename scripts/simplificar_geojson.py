"""Copia el GeoJSON de comunas desde Mapas_oferta y lo aligera para la web.

Uso: python scripts/simplificar_geojson.py "<ruta>\\Mapas_oferta\\data\\comunas.geojson"
Requiere: pip install shapely
"""
import json
import sys
from pathlib import Path

from shapely.geometry import mapping, shape

origen = Path(sys.argv[1])
destino = Path(__file__).resolve().parent.parent / "frontend" / "public" / "maps" / "comunas.geojson"
g = json.loads(origen.read_text(encoding="utf-8"))


def redondear(c):
    return [redondear(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 5), round(c[1], 5)]


salida = []
for f in g["features"]:
    p = f["properties"]
    geo = shape(f["geometry"]).simplify(0.00018, preserve_topology=True)
    m = mapping(geo)
    salida.append({"type": "Feature",
                   "properties": {"numero": p["numero"], "nombre": p["nombre_corto"], "tipo": p["tipo"],
                                  "clat": round(p["clat"], 5), "clon": round(p["clon"], 5)},
                   "geometry": {"type": m["type"], "coordinates": redondear(m["coordinates"])}})
destino.write_text(json.dumps({"type": "FeatureCollection", "features": salida}, ensure_ascii=False,
                              separators=(",", ":")), encoding="utf-8")
print(f"{len(salida)} territorios -> {destino} ({destino.stat().st_size/1024:.0f} KB)")
