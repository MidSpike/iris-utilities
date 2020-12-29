:: this script will start the bot in Windows Terminal tabs
:: the following Windows Terminal setting must be configured to match
:: profiles.defaults.startingDirectory = "."

@ECHO OFF

start /wait cmd /c .\start_pre_install.cmd

echo "Launching the bot in Windows Terminal..."
echo "You MUST have Windows Terminal configured to do this!"
echo "Check the comments in this script for more information."
echo "Use 'start_all.bat' for a non-windows-terminal experience!"

wt new-tab ".\start_server.cmd" `; new-tab ".\start_bot.cmd" `; new-tab ".\start_debug_console.cmd"
