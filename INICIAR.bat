@echo off
chcp 65001 >nul
title Analitica EPI - Unidad de Discapacidad
cd /d "%~dp0backend"

rem Si la carpeta del proyecto cambio de nombre o de lugar, el entorno de Python se vuelve a crear
if exist ".venv\pyvenv.cfg" (
  findstr /I /C:"%CD%\.venv" ".venv\pyvenv.cfg" >nul || (
    echo La carpeta del proyecto cambio de ubicacion. Recreando el entorno de Python...
    rmdir /s /q ".venv"
  )
)
if not exist ".venv\Scripts\python.exe" (
  echo Creando entorno de Python...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
set "PY=%CD%\.venv\Scripts\python.exe"
echo Verificando dependencias...
"%PY%" -m pip install -q --disable-pip-version-check -r requirements.txt

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
"%PY%" run.py
