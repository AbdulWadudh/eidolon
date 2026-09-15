@echo off
rem `where wt` fails to find the App Execution Alias when this batch runs
rem elevated (Run as Administrator) -- WindowsApps isn't reliably on PATH for
rem admin shells, even though Windows Terminal is installed. Resolve the real
rem path instead of trusting PATH lookup, falling back to a PATH search for
rem installs that put wt.exe somewhere else (e.g. winget's Program Files).
set "WT_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe"
if not exist "%WT_EXE%" for %%W in (wt.exe) do set "WT_EXE=%%~$PATH:W"
