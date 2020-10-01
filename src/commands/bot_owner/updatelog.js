'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const bot_config = require('../../../config.js');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand, sendConfirmationEmbed } = require('../../libs/messages.js');
const { isThisBotsOwner } = require('../../libs/permissions.js');
//#endregion local dependencies

const bot_common_name = bot_config.COMMON_NAME;
const bot_update_log_channel_name = bot_config.SPECIAL_CHANNELS.find(ch => ch.id === 'BOT_UPDATES').name;
const bot_update_log_file = path.join(process.cwd(), process.env.BOT_UPDATE_LOG_FILE);

module.exports = new DisBotCommand({
    name:'UPDATELOG',
    category:`${DisBotCommander.categories.BOT_OWNER}`,
    description:'updatelog',
    aliases:['updatelog'],
    access_level:DisBotCommand.access_levels.BOT_OWNER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;

        if (!isThisBotsOwner(message.author.id)) {
            sendNotAllowedCommand(message);
            return;
        }

        const update_message_embed = new CustomRichEmbed({
            title: `${bot_common_name} - Update Notification`,
            description: `${message.content.replace(discord_command, '').trim()}`,
        });
        message.channel.send(update_message_embed);
        sendConfirmationEmbed(message.author.id, message.channel.id, false, new CustomRichEmbed({
            title: 'Are you sure you want to send the update message above?',
        }), async (bot_message) => {
            //#region save update log entries to a file
            const old_updates_log = JSON.parse(fs.readFileSync(bot_update_log_file));
            const update_log_entry = {
                timestamp: `${moment()}`,
                embed: update_message_embed.toJSON(),
            };
            const new_updates_log = [
                ...old_updates_log,
                update_log_entry,
            ];
            fs.writeFileSync(bot_update_log_file, JSON.stringify(new_updates_log, null, 2));
            //#endregion save update log entries to a file

            const update_log_channels = client.channels.cache.filter(channel => channel.name === bot_update_log_channel_name);
            await bot_message.edit(new CustomRichEmbed({
                title: `Attempted sending update message to ${update_log_channels.size} guilds!`,
            }));
            for (let update_log_channel of update_log_channels.values()) {
                if (update_log_channel.permissionsFor(update_log_channel.guild.me).has('SEND_MESSAGES')) {
                    console.info(`Sent update log to ${update_log_channel.guild.name} (${update_log_channel.guild.id})`);
                    update_log_channel.send(update_message_embed);
                } else {
                    console.warn(`Unable to send update log to ${update_log_channel.guild.name} (${update_log_channel.guild.id})`);
                }
                await Timer(2500);
            }
        }, (bot_message) => {
            bot_message.edit(new CustomRichEmbed({
                title: 'Canceled Sending Update Message!',
            }));
        });
    },
});
