'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

const bot_backup_commands_channel_name = bot_config.SPECIAL_CHANNELS.find(ch => ch.id === 'BOT_COMMANDS').name;

module.exports = new DisBotCommand({
    name: 'SET_ALLOWED_CHANNELS',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 3,
    description: 'sets the allowed channels',
    aliases: ['set_allowed_channels'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const mentioned_channels = message.mentions.channels;

        if (command_args[0] === 'list') {
            const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
            message.channel.send(new CustomRichEmbed({
                title: 'My Allowed Channels',
                description: guild_config.allowed_channels.length > 0 ? (
                    `${guild_config.allowed_channels.map(channel_id => `<#${channel_id}>`).join('\n')}`
                ) : (
                    'All channels'
                ),
                fields: [
                    {
                        name: 'Notice',
                        value: `You can always run my commands from \`#${bot_backup_commands_channel_name}\``,
                    },
                ],
            }, message));
        } else if (command_args[0] === 'reset') {
            message.channel.send(new CustomRichEmbed({
                title: 'Success: removed the limitations on where I can be used!',
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                allowed_channels: []
            });
        } else if (mentioned_channels.size > 0) {
            message.channel.send(new CustomRichEmbed({
                title: `Setting New Allowed Channels`,
                description: `New Server Allowed Channels: ${'```'}\n${mentioned_channels.map(channel => channel.name).join('\n')}\n${'```'}`,
                fields: [
                    {
                        name: 'Notice',
                        value: `You can always run my commands from \`#${bot_backup_commands_channel_name}\``,
                    }, {
                        name: 'Resetting back to default',
                        value: `You can run \`${discord_command} reset\` in \`#${bot_backup_commands_channel_name}\` to reset this setting!`,
                    },
                ],
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                allowed_channels: mentioned_channels.map(channel => channel.id)
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Improper Command Usage!',
                description: 'You can use this command to restrict what channels members can use me in.',
                fields: [
                    {
                        name: 'Setting Allowed Channels',
                        value: `${'```'}\n${discord_command} #bot-commands #staff-commands #etc...\n${'```'}`,
                    }, {
                        name: 'Listing All Allowed Channels',
                        value: `${'```'}\n${discord_command} list\n${'```'}`,
                    }, {
                        name: 'Resetting Allowed Channels Back To Default',
                        value: `${'```'}\n${discord_command} reset\n${'```'}`,
                    },
                ],
            }, message));
        }
    },
});
