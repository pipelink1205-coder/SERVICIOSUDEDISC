# Analítica EPI: Unidad de Discapacidad

Aplicativo web de seguimiento mensual del reporte PI de la Unidad de Discapacidad (Alcaldía de Medellín).
Lee el libro `.xlsm` de cada mes, lo guarda como un **corte** y muestra tableros con filtros cruzados y mapa.
Contexto completo, definiciones y fases: `README.md`.

## Cómo correrlo (Windows)

- Uso normal: `INICIAR.bat` → http://127.0.0.1:8020 (API + interfaz compilada).
- Desarrollo: `DESARROLLO.bat` → API con recarga en 8020 + Vite en http://localhost:5174 (proxy `/api` → 8020).
- Pruebas: `PRUEBAS.bat` o `backend\.venv\Scripts\python.exe -m pytest -q` desde `backend\`.
- Tras cambiar el frontend para uso normal: `cd frontend && npm run build` (FastAPI sirve `frontend/dist`).
- Python siempre desde `backend\.venv\Scripts\python.exe` (no activar el venv por ruta absoluta).

## Stack

- Backend: FastAPI + pandas + openpyxl + SQLite (`data/analitica.db`). Python 3.13.
  - `app/ingesta/lector.py`: lectura del libro, mapeo de columnas, reglas de calidad, privacidad.
  - `app/ingesta/cargas.py`: registro de cortes (hash del archivo, un corte por año+mes).
  - `app/analitica/motor.py`: filtros y agregados en pandas sobre caché en memoria por corte.
  - `app/main.py`: rutas `/api/*`. `app/auth.py`: JWT local, roles `consulta` < `analista` < `admin`, auditoría.
- Frontend: React 19 + Vite + TypeScript + MUI 7 + Recharts + Leaflet (react-leaflet 5) + TanStack Query + Zustand.
  - `store/filtros.ts`: filtro global (persistido). `lib/datos.ts`: hooks de consulta. `lib/formato.ts`: formato es-CO.
  - `components/Mapa.tsx`: coroplético solo con polígonos (`public/maps/comunas.geojson`), sin mapa base ni API keys.
  - `components/Graficos.tsx`: SerieMensual, Piramide, MapaCalor, Proporcion, Chispa. `components/base.tsx`: Panel, Cifra, Barras.

## Reglas de datos (no negociables)

- Hoja prioritaria: `ESTAD. PERSONAS IND. PRODUCTO`. Las otras hojas se registran pero aún no se procesan.
- **Atención** = fila con mes de reporte legible. **Persona** = documento distinto (código sha256 con sal local en `data/`).
- Nunca guardar ni mostrar nombres, documento, dirección, fecha de nacimiento, orientación, identidad de género u observaciones.
- Hecho victimizante solo en la pantalla Vulnerabilidad (rol admin) y queda auditado. Exportaciones: solo agregados.
- Los valores no se renombran en silencio: las variantes (NINGUNA/NINGUNO, ROM-GITANO/ROM - GITANO) se reportan en Calidad del dato.
- Todo número sale de filtrar filas reales y contar, nunca de proporciones estimadas.
- Filtro cruzado: los KPIs usan todos los filtros; cada desglose ignora su propio filtro y la interfaz resalta lo seleccionado.

## Validación (libro semilla diciembre 2025)

15.308 filas leídas · 15.303 atenciones · 5 rechazadas · 12.032 personas · mujer 8.047 / hombre 7.228 ·
indicadores 2.2.5.1 = 8.741, 2.2.5.2 = 4.990, 2.2.5.3 = 1.572 · comuna con más atenciones 13 San Javier (1.541).
Ruta del libro en `backend/.env` (`EPI_CARPETA_DATOS` o `EPI_LIBRO_SEMILLA`). No cerrar un cambio de ingesta sin que pasen las pruebas.

## Convenciones

- Textos de interfaz, comentarios y nombres de variables en español. Sentence case, sin MAYÚSCULAS en etiquetas.
- No copiar libros Excel, la base ni exportaciones con personas al repositorio (ver `.gitignore`).
- Antes de dar por buena una pantalla: abrirla, aplicar un filtro cruzado (mes + servicio o comuna + sexo) y verificar que el total cambie según los registros.
- "Mi componente" se retiró a pedido del usuario: no volver a agregarlo.

## Siguientes fases

1. `DATA_ACTIVIDADES` y `ESTADISTICA_ACTIVIDADES` (actividades, lugar, participantes).
2. `ESTAD. PERSONAS IND. RESULTADO` (indicador de resultado).
3. `RESUMEN Y OBSERVACIONES`: contraste de totales oficiales contra el microdato.
