@echo off
title Eidolon - Image (ComfyUI)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\COMFY_UI" || (echo ComfyUI not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

rem Set EIDOLON_COMFY_EXTRA to add flags without editing this file. The SDXL
rem preset wants "--fp8_e4m3fn-unet --fast fp16_accumulation cublas_ops", which
rem trades quality for about a gigabyte; SD 1.5 has no need of it while the 9B
rem leaves ~8 GB free.
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build ^
 --port 8188 ^
 --preview-method taesd ^
 --disable-auto-launch ^
 --reserve-vram 0.8 ^
 %EIDOLON_COMFY_EXTRA%
pause
