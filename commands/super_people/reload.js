'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');

const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');

const { sendNotAllowedCommand } = require('../../src/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'RELOAD',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'reloads commands',
    aliases:['reload'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'reload')) {
            sendNotAllowedCommand(message);
            return;
        }
        const command_to_search_for = opts.command_args[0];
        const command_to_reload = DisBotCommander.commands.find(cmd => cmd.name === `${command_to_search_for}`);
        if (command_to_reload) {
            const command_files_directory_path = path.join(process.cwd(), './commands/');
            const command_files = recursiveReadDirectory(command_files_directory_path).filter(file => file.endsWith('.js'));

            const command_file_to_reload = command_files.find(cmd_file_path => path.parse(cmd_file_path).base === `${command_to_reload.name.toLowerCase()}.js`);

            const command_file_path_to_reload = path.join(process.cwd(), `./commands/`, command_file_to_reload);

            if (fs.existsSync(command_file_path_to_reload)) {
                message.reply(`Reloading Command File: ${command_file_to_reload}`);
                delete require.cache[require.resolve(command_file_path_to_reload)]; // IMPORTANT: Uncache the module first!
                const reloaded_command = require(command_file_path_to_reload);
                if (reloaded_command) {
                    DisBotCommander.registerCommand(reloaded_command);
                    message.reply(`Reloaded Command File: ${command_file_to_reload}`);
                    console.log(`Reloaded: ${command_file_path_to_reload}`);
                } else {
                    message.reply(`Unable to Reload Command File: ${command_file_to_reload}`);
                }
            } else {
                message.reply(`The command name specified does not have a file!`);
            }
        } else {
            message.reply(`Could not find command \`${command_to_search_for}\`!`);
        }
    },
});
