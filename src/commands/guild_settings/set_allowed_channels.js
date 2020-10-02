'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_backup_commands_channel_name = bot_config.SPECIAL_CHANNELS.find((ch) => ch.id === 'BOT_COMMANDS').name;

module.exports = new DisBotCommand({
    name: 'SET_ALLOWED_CHANNELS',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    description: 'sets allowed channels',
    aliases: ['set_allowed_channels'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts = {}) {
        const { discord_command, command_args } = opts;

        const mentioned_channels = message.mentions.channels;

        if (mentioned_channels.size > 0) {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        title: `Setting New Allowed Channels`,
                        description: `New Server Allowed Channels: ${'```'}\n${mentioned_channels
                            .map((channel) => channel.name)
                            .join('\n')}\n${'```'}`,
                        fields: [
                            {
                                name: 'Notice',
                                value: `You can always run my commands from \`#${bot_backup_commands_channel_name}\``,
                            },
                            {
                                name: 'Resetting back to default',
                                value: `You can run \`${discord_command} reset\` in \`#${bot_backup_commands_channel_name}\` to reset this setting!`,
                            },
                        ],
                    },
                    message,
                ),
            );
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                allowed_channels: mentioned_channels.map((channel) => channel.id),
            });
        } else if (command_args[0] === 'reset') {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        title: `Success: removed all limitations on where I can be used!`,
                    },
                    message,
                ),
            );
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                allowed_channels: [],
            });
        } else {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        color: 0xffff00,
                        title: 'Improper Command Usage!',
                        description: `Please provide text-channel mentions after the command next time!`,
                        fields: [
                            {
                                name: 'Example',
                                value: `${'```'}\n${discord_command} #bot-commands #staff-commands #some-other-channel\n${'```'}`,
                            },
                            {
                                name: 'Resetting Back To Default',
                                value: `${'```'}\n${discord_command} reset\n${'```'}`,
                            },
                        ],
                    },
                    message,
                ),
            );
        }
    },
});
