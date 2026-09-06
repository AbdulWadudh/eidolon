@echo off
rem Resolves EIDOLON_AI_ROOT and fails loudly rather than starting nothing.
rem %~dp0 is <repo>\stack\, so three levels up is the drive root: a repo at
rem G:\PROJECTS\eidolon finds G:\AI\EIDOLON. Set the variable for anywhere else.
if "%EIDOLON_AI_ROOT%"=="" set "EIDOLON_AI_ROOT=%~dp0..\..\..\AI\EIDOLON"

if not exist "%EIDOLON_AI_ROOT%\" (
  echo.
  echo   The AI servers are not at:
  echo     %EIDOLON_AI_ROOT%
  echo.
  echo   Set EIDOLON_AI_ROOT to where you installed them, for example:
  echo     set EIDOLON_AI_ROOT=D:i\eidolon
  echo.
  echo   stack\README.md explains what goes in there.
  echo.
  exit /b 1
)
exit /b 0
