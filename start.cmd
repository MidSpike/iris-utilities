@echo off

:: Switch working directory to this file's directory
cd /D "%~dp0"

:: Start everything
call docker compose up --build

:: Wait for user input to exit
pause
