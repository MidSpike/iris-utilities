'use strict';

//#region local dependencies
const { sendNotAllowedCommand, sendLargeMessage } = require('../../src/messages.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'GETGUILDS',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'gets guilds',
    aliases:['getguilds'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'get_guild')) {
            sendNotAllowedCommand(message);
            return;
        }
        sendLargeMessage(message.channel.id, client.guilds.cache.map(guild => `(${guild.id}) ${guild.name}`).join('\n'));
    },
});
