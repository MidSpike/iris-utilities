'use strict';

//#region local dependencies
const { math_clamp } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
const { logUserError } = require('../../libs/errors.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'CLEAR',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'Removes a specified number of messages from a guild text-channel',
    aliases: ['clear', 'purge'],
    cooldown: 2_500,
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        if (!botHasPermissionsInGuild(message, ['MANAGE_CHANNELS', 'MANAGE_MESSAGES'])) return;

        if (command_args[0] && !isNaN(parseInt(command_args[0]))) {
            const number_of_messages_to_remove = math_clamp(parseInt(command_args[0]), 0, 100);
            message.channel.bulkDelete(number_of_messages_to_remove, true).then((deleted_messages) => {
                if (guild_config.clear_message === 'enabled') {
                    message.channel.send(new CustomRichEmbed({
                        title: 'Perfectly balanced, as all things should be.',
                        description: `I deleted ${deleted_messages.size} messages for you.`,
                        thumbnail: `${bot_cdn_url}/Thanos_Glow_Gauntlet.png`,
                    }, message)).catch(console.warn);
                }
            }).catch((error) => logUserError(message, error));
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'That\'s not how messages are cleared!',
                description: `Please specify a number after ${discord_command}!`,
            }, message)).catch(console.warn);
        }
    },
});
