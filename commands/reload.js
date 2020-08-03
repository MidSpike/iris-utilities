'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');

const { DisBotCommander, DisBotCommand } = require('../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand('RELOAD', ['reload'], (client, message, opts) => {
    const command_to_reload = DisBotCommander.commands.find(cmd => cmd.name === `${opts.command_args[0]}`);
    if (command_to_reload) {
        const command_file_to_reload = path.join(process.cwd(), `./commands/${command_to_reload.name.toLowerCase()}.js`);
        if (fs.existsSync(command_file_to_reload)) {
            message.reply(`Reloading Command: ${command_to_reload.name}`);
            delete require.cache[require.resolve(command_file_to_reload)]; // IMPORTANT: Uncache the module first!
            const reloaded_command = require(command_file_to_reload);
            if (reloaded_command) {
                DisBotCommander.registerCommand(reloaded_command);
                message.reply(`Reloaded Command: ${reloaded_command.name}`);
            } else {
                message.reply(`Unable to Reload Command: ${reloaded_command.name}`);
            }
        } else {
            message.reply(`The command name specified does not have a file!`);
        }
    }
});
