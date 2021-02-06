@ECHO OFF

title I.R.I.S. Utilities Pre-Install

echo Installing required dependencies
call npm i

echo Creating required directories
if not exist ".\logging\commands" mkdir ".\logging\commands"
if not exist ".\logging\updates" mkdir ".\logging\updates"
if not exist ".\database" mkdir ".\database"
if not exist ".\temporary" mkdir ".\temporary"

echo Starting bot in 3 seconds
timeout /T 3 /NOBREAK
