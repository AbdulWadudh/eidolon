@echo off
title Eidolon - LLM (llama.cpp)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\LLAMA_CPP" || (echo llama.cpp not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

if "%EIDOLON_LLM_MODEL%"=="" set "EIDOLON_LLM_MODEL=%EIDOLON_AI_ROOT%\MODELS\L3-8B-Stheno-v3.3-32K-NEO-V1-D_AU-Q5_K_M.gguf"

llama-server.exe ^
 -m "%EIDOLON_LLM_MODEL%" ^
 --host 127.0.0.1 --port 8080 ^
 -ngl 99 -c 16384 -fa on -ctk q8_0 -ctv q8_0 ^
 --jinja -a eidolon-llm ^
 --embeddings --pooling mean

rem --embeddings serves /v1/embeddings from the same server, which is what turns
rem semantic recall on. Measured at 124-130 tok/s generate with it, the same as
rem without, so it is free here.
rem
rem If generation drops to ~12 tok/s it is not this flag, it is VRAM: the model
rem wants ~9.7 GB and llama.cpp silently spills to CPU when ComfyUI is holding
rem the card. Free it first:
rem   curl -X POST http://127.0.0.1:8188/free -H "Content-Type: application/json" ^
rem     -d "{\"unload_models\":true,\"free_memory\":true}"
pause
