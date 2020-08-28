'use strict';

//#region local dependencies
const { Timer, math_clamp } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'CLEAR',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Removes a specified number of messages from a guild text-channel',
    aliases:['clear', 'purge'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args, guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        if (!botHasPermissionsInGuild(message, ['MANAGE_CHANNELS', 'MANAGE_MESSAGES'])) return;
        if (command_args[0] && !isNaN(parseInt(command_args[0]))) {
            const remove_number = math_clamp(parseInt(command_args[0]), 0, 100);
            await Timer(1500); // Prevent API Abuse
            message.channel.bulkDelete(remove_number, true).then((deleted_messages) => {
                if (guild_config.clear_message === 'enabled') {
                    message.channel.send(new CustomRichEmbed({
                        title:`Perfectly balanced, as all things should be.`,
                        description:`I deleted ${deleted_messages.size} messages for you.`,
                        thumbnail:`${bot_cdn_url}/Thanos_Glow_Gauntlet.png`
                    }, message));
                }
            }).catch(console.trace);
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`That's not how messages are cleared!`,
                description:`Please specify a number after ${discord_command}!`
            }, message));
        }
    },
});
