@echo off
chcp 65001 >nul
rem Modo desarrollo: API con recarga en 8020 + Vite en 5174 (cambios en vivo)
cd /d "%~dp0backend"
if exist ".venv\pyvenv.cfg" (
  findstr /I /C:"%CD%\.venv" ".venv\pyvenv.cfg" >nul || rmdir /s /q ".venv"
)
if not exist ".venv\Scripts\python.exe" ( py -3 -m venv .venv 2>nul || python -m venv .venv )
set "PY=%CD%\.venv\Scripts\python.exe"
"%PY%" -m pip install -q --disable-pip-version-check -r requirements.txt
start "API EPI" cmd /k ""%PY%" run.py --dev"
cd /d "%~dp0frontend"
if not exist "node_modules" call npm install
start "" "http://localhost:5174"
npm run dev
