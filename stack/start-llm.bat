@echo off
title Eidolon - LLM (llama.cpp)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\LLAMA_CPP" || (echo llama.cpp not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

if "%EIDOLON_LLM_MODEL%"=="" set "EIDOLON_LLM_MODEL=%EIDOLON_AI_ROOT%\MODELS\L3-8B-Stheno-v3.3-32K-NEO-V1-D_AU-Q5_K_M.gguf"

llama-server.exe ^
 -m "%EIDOLON_LLM_MODEL%" ^
 --host 127.0.0.1 --port 8080 ^
 -ngl 99 -c 16384 -fa on -ctk q8_0 -ctv q8_0 ^
 --jinja -a eidolon-llm
pause
