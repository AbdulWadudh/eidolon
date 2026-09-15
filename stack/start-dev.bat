@echo off
title Eidolon - Dev
rem %~dp0 keeps whatever path this was invoked with, ".." and all, and wt
rem will not launch a pane from one. Resolve it to a real path first.
for %%i in ("%~dp0.") do set "HERE=%%~fi"

call "%HERE%\_env.bat" || (pause & exit /b 1)

rem kill the following ports before running the servers 3000, 8880, 8082, 8080, 8188
for %%P in (3000 8080 8082 8188 8880) do for /f "tokens=5" %%A in ('netstat -ano -p tcp ^| find ":%%P" ^| find "LISTENING"') do taskkill /PID %%A /F >nul 2>&1

call "%HERE%\_wt.bat"
if not exist "%WT_EXE%" (
  echo Windows Terminal ^(wt.exe^) not found. Falling back to separate windows.
  start "Eidolon Conductor" cmd /k "%HERE%\start-conductor.bat"
  start "Eidolon Canvas"    cmd /k "%HERE%\start-canvas.bat"
  call "%HERE%\start-all.bat"
  exit /b 0
)

rem Conductor and canvas are what you're actually iterating on, so they get
rem their own window; the AI stacks are backing services and share another.
"%WT_EXE%" -w new new-tab --title "Eidolon App" cmd /k "%HERE%\start-conductor.bat" ^; split-pane -V cmd /k "%HERE%\start-canvas.bat"
"%WT_EXE%" new-tab --title Eidolon cmd /k "%HERE%\start-comfy.bat" ^; split-pane -H cmd /k "%HERE%\start-llm.bat" ^; split-pane -V cmd /k "%HERE%\start-tts.bat" ^; split-pane -H cmd /k "%HERE%\start-embed.bat"
