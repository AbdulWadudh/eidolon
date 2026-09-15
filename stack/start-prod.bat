@echo off
title Eidolon - Prod
for %%i in ("%~dp0.") do set "HERE=%%~fi"

call "%HERE%\_env.bat" || (pause & exit /b 1)

call "%HERE%\_wt.bat"

rem kill the following ports before running the servers 3000, 8880, 8082, 8080, 8188
for %%P in (3000 8080 8082 8188 8880) do for /f "tokens=5" %%A in ('netstat -ano -p tcp ^| find ":%%P" ^| find "LISTENING"') do taskkill /PID %%A /F >nul 2>&1


if not exist "%WT_EXE%" (
  echo Windows Terminal ^(wt.exe^) not found. Falling back to separate windows.
  start "Eidolon LLM"       cmd /k "%HERE%\start-llm.bat"
  start "Eidolon Embed"     cmd /k "%HERE%\start-embed.bat"
  start "Eidolon Image"     cmd /k "%HERE%\start-comfy.bat"
  start "Eidolon TTS"       cmd /k "%HERE%\start-tts.bat"
  start "Eidolon Conductor" cmd /k "%HERE%\start-conductor-prod.bat"
  exit /b 0
)

rem Everything but canvas, one window: canvas ships as the APK/web build in
rem prod, it does not run as a dev server here.
"%WT_EXE%" new-tab --title Eidolon cmd /k "%HERE%\start-conductor-prod.bat" ^; split-pane -V cmd /k "%HERE%\start-comfy.bat" ^; split-pane -H cmd /k "%HERE%\start-llm.bat" ^; split-pane -V cmd /k "%HERE%\start-tts.bat" ^; split-pane -H cmd /k "%HERE%\start-embed.bat"