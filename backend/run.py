"""Arranca la API:  python run.py   (http://127.0.0.1:8020, documentación en /api/docs)"""
import sys

import uvicorn

from app.config import PUERTO

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    recarga = "--dev" in sys.argv
    uvicorn.run("app.main:app", host="127.0.0.1", port=PUERTO, reload=recarga)
