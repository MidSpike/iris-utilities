'use strict';

//#region dependencies
const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name:'ECHO',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'echo',
    aliases:['echo'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'echo')) {
            sendNotAllowedCommand(message);
            return;
        }
        message.channel.send(message.content.replace(discord_command, '').trim());
    },
});
