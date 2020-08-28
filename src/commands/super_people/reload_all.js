'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');

const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'RELOAD_ALL',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'reloads all commands',
    aliases:['reload_all'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'reload')) {
            sendNotAllowedCommand(message);
            return;
        }
        await message.reply(`Reloading All Command Files`);
        try {
            for (const command_to_reload of DisBotCommander.commands.values()) {
                const command_files_directory_path = path.join(process.cwd(), './src/commands/');
                const command_files = recursiveReadDirectory(command_files_directory_path).filter(file => file.endsWith('.js'));
    
                const command_file_to_reload = command_files.find(cmd_file_path => path.parse(cmd_file_path).base === `${command_to_reload.name.toLowerCase()}.js`);
    
                const command_file_path_to_reload = path.join(process.cwd(), `./src/commands/`, command_file_to_reload);
    
                delete require.cache[require.resolve(command_file_path_to_reload)]; // IMPORTANT: Uncache the module first!
                const reloaded_command = require(command_file_path_to_reload);
                if (reloaded_command) {
                    DisBotCommander.registerCommand(reloaded_command);
                    console.log(`Reloaded: ${command_file_path_to_reload}`);
                } else {
                    throw new Error(`Unable to Reload Command File: ${command_file_to_reload}`);
                }
            }
            message.reply(`Finished Reloading All Command Files`);
        } catch (error) {
            message.reply(`${error}`);
        }
    },
});
