@echo off
title Eidolon - TTS (Kokoro-FastAPI)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\KOKORO_TTS" || (echo Kokoro not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

set PYTHONUTF8=1
set USE_GPU=true
set PROJECT_ROOT=%CD%
set PYTHONPATH=%CD%;%CD%pi
set MODEL_DIR=src/models
set VOICES_DIR=src/voices/v1_0
set WEB_PLAYER_PATH=%CD%\web
.\.venv\Scripts\python.exe -m uvicorn api.src.main:app --host 127.0.0.1 --port 8880
pause
