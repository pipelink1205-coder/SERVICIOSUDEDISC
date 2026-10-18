@echo off
chcp 65001 >nul
rem Prueba de aceptacion con el libro de diciembre 2025 (ruta en backend\.env: EPI_LIBRO_SEMILLA o EPI_CARPETA_DATOS)
cd /d "%~dp0backend"
call ".venv\Scripts\activate.bat"
python -m pytest -q
pause
