'use strict';

//#region dependencies
const { sendNotAllowedCommand, sendLargeMessage } = require('../../libs/messages.js');
const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion dependencies

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
