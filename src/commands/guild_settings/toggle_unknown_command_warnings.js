'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TOGGLE_UNKNOWN_COMMAND_WARNINGS',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 13,
    description: 'toggles sending warnings for unknown commands',
    aliases: ['toggle_unknown_command_warnings'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const unknown_command_warnings = guild_config.unknown_command_warnings === 'enabled';
        if (unknown_command_warnings === true) {
            message.channel.send(new CustomRichEmbed({
                title: 'Unknown Command Warnings: disabled;',
                description: 'When a user tries to use an unknown command, the bot will not send an unknown command warning.',
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                unknown_command_warnings: 'disabled',
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title: 'Unknown Command Warnings: enabled;',
                description: 'When a user tries to use an unknown command, the bot will send an unknown command warning.',
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                unknown_command_warnings: 'enabled',
            });
        }
    },
});
