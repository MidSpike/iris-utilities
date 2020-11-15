@ECHO OFF
title I.R.I.S. Utilities Debug Console

:start_debug_console
node --trace-warnings .\debug_console.js
timeout /T 5 /NOBREAK
goto :start_debug_console

pause
