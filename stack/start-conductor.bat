@echo off
title Eidolon - Conductor
cd /d "%~dp0.."
bunx kill-port 3000
bun --cwd apps/conductor dev
pause
