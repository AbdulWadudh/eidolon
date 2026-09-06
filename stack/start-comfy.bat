@echo off
title Eidolon - Image (ComfyUI)
call "%~dp0_env.bat" || (pause & exit /b 1)

cd /d "%EIDOLON_AI_ROOT%\COMFY_UI" || (echo ComfyUI not found in %EIDOLON_AI_ROOT% & pause & exit /b 1)

.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build ^
 --port 8188 ^
 --fp8_e4m3fn-unet ^
 --preview-method taesd ^
 --disable-auto-launch ^
 --fast fp16_accumulation cublas_ops ^
 --reserve-vram 0.8
pause
