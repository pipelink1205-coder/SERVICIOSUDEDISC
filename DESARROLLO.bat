@echo off
chcp 65001 >nul
rem Modo desarrollo: API con recarga en 8020 + Vite en 5174 (cambios en vivo)
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" ( py -3 -m venv .venv 2>nul || python -m venv .venv )
start "API EPI" cmd /k "call .venv\Scripts\activate.bat && pip install -q -r requirements.txt && python run.py --dev"
cd /d "%~dp0frontend"
if not exist "node_modules" call npm install
start "" "http://localhost:5174"
npm run dev
