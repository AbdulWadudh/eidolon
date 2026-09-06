@echo off
title Eidolon - Stack
rem %~dp0 keeps whatever path this was invoked with, ".." and all, and wt
rem will not launch a pane from one. Resolve it to a real path first.
for %%i in ("%~dp0.") do set "HERE=%%~fi"

call "%HERE%\_env.bat" || (pause & exit /b 1)

where wt >nul 2>nul || (
  echo Windows Terminal ^(wt.exe^) not found. Falling back to separate windows.
  call "%HERE%\start-all.bat"
  exit /b 0
)

rem One window, three panes: llama.cpp on the left, ComfyUI top right, Kokoro
rem bottom right.
rem
rem Two things this has to get right. The semicolons separating wt's
rem sub-commands must be escaped as ^; or cmd eats them as argument separators
rem and only the first pane opens. And --title belongs to new-tab, not to wt
rem itself: passing it globally makes wt reject the first command, so the tab
rem opens with only the two split panes in it.
wt new-tab --title Eidolon cmd /k "%HERE%\start-llm.bat" ^; split-pane -V cmd /k "%HERE%\start-comfy.bat" ^; split-pane -H cmd /k "%HERE%\start-tts.bat"
