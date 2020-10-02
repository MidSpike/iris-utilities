'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'SUPERCOMMANDS',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'super commands',
    aliases: ['supercommands'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts = {}) {
        const guild_admin_commands = DisBotCommander.commands
            .filter((cmd) => cmd.category === DisBotCommander.categories.ADMINISTRATOR)
            .map((cmd) => cmd.aliases.join(' | '));
        const guild_settings_commands = DisBotCommander.commands
            .filter((cmd) => cmd.category === DisBotCommander.categories.GUILD_SETTINGS)
            .map((cmd) => cmd.aliases.join(' | '));
        const super_people_commands = DisBotCommander.commands
            .filter((cmd) => cmd.category === DisBotCommander.categories.SUPER_PEOPLE)
            .map((cmd) => cmd.aliases.join(' | '));
        const bot_owner_commands = DisBotCommander.commands
            .filter((cmd) => cmd.category === DisBotCommander.categories.BOT_OWNER)
            .map((cmd) => cmd.aliases.join(' | '));

        message.channel.send(
            new CustomRichEmbed(
                {
                    title: `Super Commands`,
                    description: `Here is a list of commands made available to Super People and my Owner!\nSome commands require certain permissions!`,
                    fields: [
                        {
                            name: 'Guild Admin Commands',
                            value: `${'```'}\n${guild_admin_commands.join('\n')}\n${'```'}`,
                        },
                        {
                            name: 'Guild Settings Commands',
                            value: `${'```'}\n${guild_settings_commands.join('\n')}\n${'```'}`,
                        },
                        {
                            name: 'Super People Commands',
                            value: `${'```'}\n${super_people_commands.join('\n')}\n${'```'}`,
                        },
                        { name: 'Bot Owner Commands', value: `${'```'}\n${bot_owner_commands.join('\n')}\n${'```'}` },
                    ],
                },
                message,
            ),
        );
    },
});
