:: this script will start the bot in 2 Windows Terminal tabs
:: the following Windows Terminal setting must be configured to match
:: profiles.defaults.startingDirectory = "."

@ECHO OFF
echo "Launching the bot in Windows Terminal..."
echo "You MUST have Windows Terminal configured to do this!"
echo "Check the comments in this script for more information."
echo "Use 'start_all.bat' for a non-windows-terminal experience!"
wt new-tab ".\start_server.bat" `; new-tab ".\start_bot.bat"