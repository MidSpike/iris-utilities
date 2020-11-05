'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'TOGGLE_COMMAND_MESSAGE_REMOVAL',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 12,
    description: 'toggles removal of command messages',
    aliases: ['toggle_command_message_removal'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const command_message_removal = guild_config.command_message_removal === 'enabled';
        if (command_message_removal === true) {
            message.channel.send(new CustomRichEmbed({
                title: 'Command Message Removal: disabled;',
                description: 'When a user uses a command, the user\'s message will not be removed.',
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                command_message_removal: 'disabled',
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title: 'Command Message Removal: enabled;',
                description: 'When a user uses a command, the user\'s message will be removed.',
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                command_message_removal: 'enabled',
            });
        }
    },
});
