@echo off
title Eidolon - Start All
start "Eidolon LLM"   cmd /k "%~dp0start-llm.bat"
start "Eidolon Image" cmd /k "%~dp0start-comfy.bat"
start "Eidolon TTS"   cmd /k "%~dp0start-tts.bat"
echo Launched LLM (8080), ComfyUI (8188), Kokoro TTS (8880).
echo Prefer: bun run stack:up, which waits for each one to answer.
