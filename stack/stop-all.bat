@echo off
taskkill /F /IM llama-server.exe 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8188 .*LISTENING"') do taskkill /F /PID %%p 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8880 .*LISTENING"') do taskkill /F /PID %%p 2>nul
echo Stopped Eidolon AI servers.
