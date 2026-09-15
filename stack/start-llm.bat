@echo off
title Eidolon - LLM (llama.cpp)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\LLAMA_CPP" || (echo llama.cpp not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

rem Every model-specific value is a variable, so swapping models is editing this
rem block rather than the command below. Keep these in step with the matching
rem entry in packages/config/src/llm.ts, which is where the conductor reads the
rem stop tokens, samplers and context budget from.
if "%EIDOLON_LLM_MODEL%"=="" set "EIDOLON_LLM_MODEL=%EIDOLON_AI_ROOT%\MODELS\Qwen3.5-9B-The-Defiant-Fable-Uncnr-Heretic-NEO-MAX-Q6_K.gguf"
if "%EIDOLON_LLM_NGL%"==""   set "EIDOLON_LLM_NGL=99"
if "%EIDOLON_LLM_CTX%"==""   set "EIDOLON_LLM_CTX=32768"
rem off for a model that thinks before it answers, auto for one that does not.
if "%EIDOLON_LLM_REASONING%"=="" set "EIDOLON_LLM_REASONING=off"

if not exist "%EIDOLON_LLM_MODEL%" (\
  echo.
  echo   No chat model at:
  echo     %EIDOLON_LLM_MODEL%
  echo.
  echo   stack\README.md has the download.
  echo.
  pause & exit /b 1
)

.\llama-server.exe ^
 -m "%EIDOLON_LLM_MODEL%" ^
 --host 127.0.0.1 --port 8080 ^
 -ngl %EIDOLON_LLM_NGL% ^
 -c %EIDOLON_LLM_CTX% ^
 -b 2048 -ub 1024 ^
 -fa on ^
 --cache-type-k q4_0 --cache-type-v q4_0 ^
 --threads 8 --parallel 1 ^
 --reasoning %EIDOLON_LLM_REASONING% ^
 --jinja -a eidolon-llm

rem Measured on a 5070 Ti (16 GB), Qwen3.5-9B-heretic Q6_K at 32k:
rem   7,987 MiB total GPU including the desktop, 87 tok/s generate, 456 prefill.
rem That leaves ~8.3 GB for ComfyUI, which wants ~4.2 GB, so both stay resident
rem and a render never waits for the chat model to get out of the way.
rem
rem --reasoning off matters for any model whose template opens inside <think>:
rem left on, it spends the whole reply budget reasoning and the reader gets
rem nothing. Harmless on a model that does not think.
rem
rem A 27B does not fit this card. Fully offloaded it needs ~18.3 GB against
rem 16.3 GB, and llama-bench measured prefill collapsing from 976 to 144 tok/s
rem at -ngl 64 as it spilled over PCIe. 4.5 tok/s at -ngl 26.
rem
rem No --embeddings here on purpose: it forces n_batch down to n_ubatch (512)
rem and prefill drops with it. Recall runs off start-embed.bat on 8081 instead.
pause
