@echo off
title Eidolon - Conductor (prod)
cd /d "%~dp0..\apps\conductor"
set NODE_ENV=production
bun run src/index.ts
pause
