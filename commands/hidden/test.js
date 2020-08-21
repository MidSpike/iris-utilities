'use strict';

//#region local dependencies
const { sendLargeMessage } = require('../../src/messages.js');
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TEST',
    category:`${DisBotCommander.categories.HIDDEN}`,
    description:'used for testing purposes',
    aliases:['test'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title:`Hello World! I'm ${client.user.username}!`
        }));
    },
});
