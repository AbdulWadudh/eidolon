@echo off
rem An elevated window (Run as Administrator) can start from a PATH snapshot
rem taken before a tool like bun or Windows Terminal registered itself, so
rem "bun"/"bunx"/"wt" come back "not recognized" even though they work fine
rem everywhere else. Re-read PATH from the registry, the source of truth,
rem instead of trusting whatever this process was handed at launch.
for /f "usebackq tokens=2,*" %%A in (`reg query "HKCU\Environment" /v Path 2^>nul`) do set "EIDOLON_USERPATH=%%B"
for /f "usebackq tokens=2,*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul`) do set "EIDOLON_SYSPATH=%%B"
if defined EIDOLON_SYSPATH if defined EIDOLON_USERPATH call set "PATH=%EIDOLON_SYSPATH%;%EIDOLON_USERPATH%"
