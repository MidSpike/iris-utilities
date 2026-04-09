@echo off

:: Switch working directory to this file's directory
cd /D "%~dp0"

:: Start everything
call docker compose --profile lavalink --profile libre-translate up --build --remove-orphans

:: Wait for user input to exit
pause
