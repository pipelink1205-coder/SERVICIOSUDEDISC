@echo off
chcp 65001 >nul
rem Prueba de aceptacion con el libro de diciembre 2025 (ruta en backend\.env: EPI_LIBRO_SEMILLA o EPI_CARPETA_DATOS)
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" ( echo Primero ejecuta INICIAR.bat & pause & exit /b )
".venv\Scripts\python.exe" -m pytest -q -p no:cacheprovider
pause
