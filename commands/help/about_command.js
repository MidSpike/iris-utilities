'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'ABOUT_COMMAND',
    category:`${DisBotCommander.categories.HELP}`,
    description:'Displays information on a command',
    aliases:['about_command'],
    access_level:DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, command_args } = opts;

        const specified_command_input = `${command_args[0]}`.toLowerCase();
        const specified_command_input_with_prefix = specified_command_input.startsWith(command_prefix) ? specified_command_input : `${command_prefix}${specified_command_input}`;
        const specified_command = DisBotCommander.commands.find(cmd => 
            cmd.aliases.map(cmd => 
                `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`
            ).includes(specified_command_input_with_prefix)
        );

        if (specified_command) {
            const specified_command_aliases = specified_command.aliases.map(cmd => `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`);
            message.channel.send(new CustomRichEmbed({
                title:`About Command — ${specified_command_input}`,
                description:[
                    `**Formal Name:** ${specified_command.name}`,
                    `**Category:** ${specified_command.category}`,
                    `**Description:** ${specified_command.description}`,
                    `**Aliases:** ${specified_command_aliases.join(', ')}`,
                    `**Access Level:** ${specified_command.access_level}`
                ].join('\n')
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`About Command — ${specified_command_input}`,
                description:`I couldn't find that command!`
            }, message));
        }
    },
});
