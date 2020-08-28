'use strict';

//#region local dependencies
const SHARED_VARIABLES = require('../../SHARED_VARIABLES.js');
const { disBotServers } = require('../../SHARED_VARIABLES.js');
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
            const server = disBotServers[guild.id];
            server.lockdown_mode = !server.lockdown_mode;
            message.channel.send(new CustomRichEmbed({
                title:`Guild ${guild.name} (${guild.id}) Lockdown Mode: ${server.lockdown_mode ? 'Enabled' : 'Disabled'}`
            }));
        } else {
            SHARED_VARIABLES.lockdown_mode = !SHARED_VARIABLES.lockdown_mode;
            message.channel.send(new CustomRichEmbed({
                title:`Lockdown Mode: ${SHARED_VARIABLES.lockdown_mode ? 'Enabled' : 'Disabled'}`
            }));
        }
    },
});
