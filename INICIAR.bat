@echo off
chcp 65001 >nul
title Analitica EPI - Unidad de Discapacidad
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo Creando entorno de Python por primera vez...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
call ".venv\Scripts\activate.bat"
echo Verificando dependencias...
python -m pip install -q --disable-pip-version-check -r requirements.txt

if not exist "..\frontend\dist\index.html" (
  echo Compilando la interfaz por primera vez...
  pushd ..\frontend
  call npm install
  call npm run build
  popd
)

echo.
echo  Analitica EPI corriendo en http://127.0.0.1:8020
echo  Cierra esta ventana para detenerla.
echo.
start "" "http://127.0.0.1:8020"
python run.py
