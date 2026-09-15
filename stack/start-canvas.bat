@echo off
title Eidolon - Canvas
cd /d "%~dp0.."
bunx kill-port 8081
bun --cwd apps/canvas dev
pause
