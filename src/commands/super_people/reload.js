'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');

const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isSuperPerson,
        isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'RELOAD',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'reloads commands',
    aliases: ['reload'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, command_args } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'reload')) {
            sendNotAllowedCommand(message);
            return;
        }

        const specified_command_input = `${command_args[0]}`.toLowerCase();
        const specified_command_input_with_prefix = specified_command_input.startsWith(command_prefix) ? specified_command_input : `${command_prefix}${specified_command_input}`;
        const command_to_reload = DisBotCommander.commands.find(cmd => 
            cmd.aliases.map(cmd => 
                `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`
            ).includes(specified_command_input_with_prefix)
        );

        if (command_to_reload) {
            const command_files_directory_path = path.join(process.cwd(), './src/commands/');
            const command_files = recursiveReadDirectory(command_files_directory_path).filter(file => file.endsWith('.js'));

            const command_file_to_reload = command_files.find(cmd_file_path => path.parse(cmd_file_path).base === `${command_to_reload.name.toLowerCase()}.js`);

            const command_file_path_to_reload = path.join(process.cwd(), `./src/commands/`, command_file_to_reload);

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
                message.reply('The command name specified does not have a file!');
            }
        } else {
            message.reply(`Could not find command \`${specified_command_input_with_prefix}\`!`);
        }
    },
});
