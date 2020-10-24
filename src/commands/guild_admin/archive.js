'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendConfirmationMessage } = require('../../libs/messages.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion local dependencies

const bot_special_channels = bot_config.SPECIAL_CHANNELS;
const bot_archived_channels_category_name = bot_special_channels.find(ch => ch.id === 'ARCHIVED_CHANNELS_CATEGORY').name;

module.exports = new DisBotCommand({
    name:'ARCHIVE',
    category:`${DisBotCommander.categories.GUILD_ADMIN}`,
    description:'Archive channels',
    aliases:['archive'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        if (!botHasPermissionsInGuild(message, ['MANAGE_CHANNELS'])) return;
        sendConfirmationMessage(message.author.id, message.channel.id, false, new CustomRichEmbed({
            title: 'Do you wish to proceed?',
            description: 'This command will archive this channel and prevent non-staff from viewing it'
        }, message), async (bot_message) => {
            const channel_to_archive = message.channel;
            await channel_to_archive.overwritePermissions([
                {
                    id: message.guild.roles.everyone.id,
                    deny:['VIEW_CHANNEL'],
                }, {
                    id: message.guild.me.id,
                    allow:['VIEW_CHANNEL'],
                },
            ], `${message.author.tag} archived the channel!`);
            const potential_category_channel = message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name === bot_archived_channels_category_name);
            const category_to_make = potential_category_channel ?? await message.guild.channels.create(`${bot_archived_channels_category_name}`, {
                type: 'category',
                permissionOverwrites: [
                    {
                        id: message.guild.roles.everyone.id,
                        deny:['VIEW_CHANNEL'],
                    }, {
                        id: message.guild.me.id,
                        allow: ['VIEW_CHANNEL'],
                    },
                ],
            });
            await channel_to_archive.setParent(category_to_make);
            await message.channel.send(new CustomRichEmbed({
                title: 'Archived channel!',
            }, message));
            await bot_message.delete({timeout: 500}).catch(error => console.warn(`Unable to delete message`, error));
        }, async (bot_message) => {
            await message.channel.send(new CustomRichEmbed({
                title: 'Canceled archive!',
            }, message));
            await bot_message.delete({timeout: 500}).catch(error => console.warn(`Unable to delete message`, error));
        });
    },
});
