'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const bot_config = require('../../config.json');
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { sendNotAllowedCommand, sendConfirmationEmbed } = require('../../src/messages.js');
const { isThisBotsOwner } = require('../../src/permissions.js');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;
const bot_update_log_channel_name = bot_config.special_channels.BOT_UPDATES.public_name;
const bot_update_log_file = path.join(process.cwd(), process.env.BOT_UPDATE_LOG_FILE);

module.exports = new DisBotCommand({
    name:'UPDATELOG',
    category:`${DisBotCommander.categories.BOT_OWNER}`,
    description:'updatelog',
    aliases:['updatelog'],
    access_level:DisBotCommand.access_levels.BOT_OWNER,
    async executor(Discord, client, message, opts={}) {
        console.log(`this should not log!`);
        const { discord_command } = opts;
        if (!isThisBotsOwner(message.author.id)) {
            sendNotAllowedCommand(message);
            return;
        }
        const update_message_embed = new CustomRichEmbed({
            title:`${bot_common_name} - Update Notification`,
            description:`${message.content.replace(discord_command, '').trim()}`
        });
        message.channel.send(update_message_embed);
        sendConfirmationEmbed(message.author.id, message.channel.id, false, new CustomRichEmbed({
            title:'Are you sure you want to send the update message above?'
        }), async (bot_message) => {
            //#region Update Log Logging
            const old_updates_log = JSON.parse(fs.readFileSync(bot_update_log_file));
            const update_log_entry = {
                timestamp:`${moment()}`,
                embed:update_message_embed.toJSON()
            };
            const new_updates_log = [...old_updates_log, update_log_entry];
            fs.writeFileSync(bot_update_log_file, JSON.stringify(new_updates_log, null, 2));
            //#endregion Update Log Logging

            const update_log_channels = client.channels.cache.filter(channel => channel.name === bot_update_log_channel_name);
            await bot_message.edit(new CustomRichEmbed({
                title:`Attempted Sending Update Messsage To ${update_log_channels.size} Guilds!`
            }));
            for (let update_log_channel of update_log_channels.values()) {
                console.log(update_log_channel);
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
                title:'Canceled Sending Update Message!'
            }));
        });
    },
});
