@ECHO OFF
title I.R.I.S. Utilities API Server

:start_server
node --trace-warnings .\server.js
timeout /T 5 /NOBREAK
goto :start_server

pause
