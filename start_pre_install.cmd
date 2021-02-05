@ECHO OFF

title I.R.I.S. Utilities Pre-Install

echo installing required dependencies
npm i

echo creating required directories
if not exist ".\logging\commands" mkdir ".\logging\commands"
if not exist ".\logging\updates" mkdir ".\logging\updates"
if not exist ".\database" mkdir ".\database"
if not exist ".\temporary" mkdir ".\temporary"

pause
