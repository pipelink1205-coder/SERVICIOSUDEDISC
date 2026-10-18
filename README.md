# Analítica EPI: Unidad de Discapacidad

Aplicativo web para analizar, mes a mes, el reporte estadístico de la Unidad de Discapacidad (reporte PI).
Cada libro mensual (`.xlsm` o `.xlsx`) se carga como un **corte**. El tablero cruza servicios, personas y
territorio sobre los registros reales: no usa proporciones estimadas.

## Cómo abrirlo

Doble clic en **`INICIAR.bat`**. La primera vez crea el entorno de Python, instala dependencias y abre
http://127.0.0.1:8020.

- Usuario inicial: `admin`. Clave inicial: `Discapacidad2026*`. Las dos están en `backend\.env`; cambia la clave antes de compartir el aplicativo.
- Para cargar el primer corte: **Cargas → Leer ruta** (usa la carpeta `Reportes` configurada en `.env`), o arrastra el libro.

Requisitos: Python 3.11 o superior. Node.js 20 o superior solo si vas a modificar la interfaz.

| Archivo | Para qué |
| --- | --- |
| `INICIAR.bat` | Uso normal: API e interfaz compilada en un solo puerto (8020) |
| `DESARROLLO.bat` | Cambios en vivo: API con recarga (8020) y Vite (5174) |
| `PRUEBAS.bat` | Prueba de aceptación con el libro de diciembre 2025 |

## Stack

| Capa | Tecnología |
| --- | --- |
| API | FastAPI, pandas, openpyxl (`backend/`) |
| Datos | SQLite (`data/analitica.db`). La capa de consultas está aislada en `app/analitica/motor.py` |
| Interfaz | React 19, Vite, TypeScript, Material UI 7, Recharts, Leaflet, TanStack Query, Zustand (`frontend/`) |
| Mapa | Polígonos propios en `frontend/public/maps/comunas.geojson` (aligerado desde `Mapas_oferta/data/comunas.geojson` con `scripts/simplificar_geojson.py`). No usa mapas base externos ni claves de API, y funciona sin internet |

## Estructura

```
ANALITICA DATOS EPI/
├── backend/
│   ├── app/
│   │   ├── ingesta/lector.py   lectura del libro, columnas, calidad, privacidad
│   │   ├── ingesta/cargas.py   registro de cortes
│   │   ├── analitica/motor.py  filtros cruzados y agregados
│   │   ├── auth.py             usuarios, roles, auditoría
│   │   ├── exportar.py         Excel de agregados
│   │   └── main.py             rutas /api/*
│   ├── tests/test_aceptacion.py
│   └── run.py
├── frontend/src/
│   ├── pages/        Inicio, Servicios, Personas, Territorio, Evolucion, Vulnerabilidad, Cargas, Calidad, Admin
│   ├── components/   Marco, BarraFiltros, Mapa, Graficos, base
│   └── store/        filtros globales y sesión
├── data/             base, copias privadas de los libros, secretos locales (no se versiona)
└── scripts/
```

## Definiciones

- **Atención**: una fila válida de la hoja `ESTAD. PERSONAS IND. PRODUCTO` (mes de reporte legible).
- **Persona**: un documento distinto dentro del filtro activo.
- **Corte**: un libro cargado, identificado por año y mes. El libro de cada mes es acumulado; el corte más reciente es el que se muestra por defecto. Un libro nuevo del mismo año y mes reemplaza al anterior.
- **Filtro cruzado**: los totales usan todos los filtros. Cada gráfico ignora su propio filtro para que lo seleccionado se vea resaltado frente a las demás opciones.

## Validación con el libro semilla (diciembre 2025)

| Conteo | Valor |
| --- | ---: |
| Filas leídas | 15.308 |
| Atenciones válidas | 15.303 |
| Filas rechazadas (encabezados y códigos: `IS41AD`, `IS13AI`…) | 5 |
| Personas distintas | 12.032 |
| Mujer / hombre / indefinido / intersexual | 8.047 / 7.228 / 20 / 8 |
| Indicadores 2.2.5.1 / 2.2.5.2 / 2.2.5.3 | 8.741 / 4.990 / 1.572 |

El README anterior hablaba de 15.307 registros. El número correcto es 15.303: las otras 4 filas no son atenciones.

## Privacidad

- El documento se guarda solo como un código irreversible (sha256 con una sal local en `data/`). Si se borra la sal, los cortes nuevos dejan de ser comparables por persona con los viejos.
- No se guardan nombres, dirección, fecha de nacimiento, orientación sexual, identidad de género ni observaciones.
- Hecho victimizante solo aparece en **Vulnerabilidad**, para el rol `admin`, y cada consulta queda en la auditoría.
- La exportación a Excel incluye solo agregados.

## Roles

| Rol | Puede |
| --- | --- |
| consulta | Ver tableros y exportar agregados |
| analista | Además, cargar cortes y revisar la calidad del dato |
| admin | Además, ver Vulnerabilidad y gestionar usuarios |

## Siguientes fases

1. `DATA_ACTIVIDADES` y `ESTADISTICA_ACTIVIDADES`: actividades, lugar, participantes.
2. `ESTAD. PERSONAS IND. RESULTADO`: indicador de resultado, con el mismo cuidado de identidad.
3. `RESUMEN Y OBSERVACIONES`: contraste de totales oficiales contra el microdato.
