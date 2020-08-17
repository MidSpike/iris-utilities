'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TEST',
    category:`${DisBotCommander.categories.HIDDEN}`,
    description:'used for testing purposes',
    aliases:['test'],
    access_level:DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title:`Hello World! I'm ${client.user.username}!`
        }));
    },
});
