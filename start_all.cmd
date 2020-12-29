@ECHO OFF

start /wait cmd /c .\start_pre_install.cmd

start .\start_bot.cmd
start .\start_server.cmd
start .\start_debug_console.cmd
