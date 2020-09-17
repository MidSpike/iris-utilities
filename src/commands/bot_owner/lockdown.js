'use strict';

//#region local dependencies
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
            const guild_lockdown_mode = client.$.guild_lockdowns.set(message.guild.id, !old_guild_lockdown_mode);
            message.channel.send(new CustomRichEmbed({
                title:`Guild ${guild.name} (${guild.id}) Lockdown Mode: ${guild_lockdown_mode ? 'Enabled' : 'Disabled'}`
            }));
        } else {
            client.$.lockdown_mode = !client.$.lockdown_mode;
            message.channel.send(new CustomRichEmbed({
                title:`Lockdown Mode: ${client.$.lockdown_mode ? 'Enabled' : 'Disabled'}`
            }));
        }
    },
});
