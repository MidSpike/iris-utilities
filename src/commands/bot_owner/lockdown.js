'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isThisBotsOwner } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'LOCKDOWN',
    category:`${DisBotCommander.categories.BOT_OWNER}`,
    description:'lockdown',
    aliases:['lockdown'],
    access_level:DisBotCommand.access_levels.BOT_OWNER,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;

        if (!isThisBotsOwner(message.author.id)) {
            sendNotAllowedCommand(message);
            return;
        }

        if (['guild', 'server'].includes(command_args[0])) {
            const guild = client.guilds.cache.get(command_args[1]) ?? message.guild;

            const old_guild_lockdown_mode = client.$.guild_lockdowns.get(message.guild.id);
            console.log({old_guild_lockdown_mode});

            client.$.guild_lockdowns.set(message.guild.id, !old_guild_lockdown_mode);
            const new_guild_lockdown_mode = client.$.guild_lockdowns.get(message.guild.id);
            console.log({new_guild_lockdown_mode});

            message.channel.send(new CustomRichEmbed({
                color: 0xFF00FF,
                title: `${guild.name} (${guild.id})`,
                description: `Lockdown Mode: ${new_guild_lockdown_mode ? 'Enabled' : 'Disabled'}`,
            }));
        } else {
            client.$.lockdown_mode = !client.$.lockdown_mode;
            message.channel.send(new CustomRichEmbed({
                color: 0xFF00FF,
                title: `${bot_config.COMMON_NAME}`,
                description: `Lockdown Mode: ${client.$.lockdown_mode ? 'Enabled' : 'Disabled'}`,
            }));
        }
    },
});
