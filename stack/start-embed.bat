@echo off
title Eidolon - Embeddings (llama.cpp)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\LLAMA_CPP" || (echo llama.cpp not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

if "%EIDOLON_EMBED_MODEL%"=="" set "EIDOLON_EMBED_MODEL=%EIDOLON_AI_ROOT%\MODELS\nomic-embed-text-v1.5.Q5_K_M.gguf"

if not exist "%EIDOLON_EMBED_MODEL%" (
  echo.
  echo   No embedding model at:
  echo     %EIDOLON_EMBED_MODEL%
  echo.
  echo   Recall falls back to the chat model, which ranks correctly but scores
  echo   everything into a narrow band. stack\README.md has the download.
  echo.
  pause & exit /b 1
)

llama-server.exe ^
 -m "%EIDOLON_EMBED_MODEL%" ^
 --host 127.0.0.1 --port 8081 ^
 -ngl 99 -c 8192 ^
 --embeddings --pooling mean -a eidolon-embed
pause
