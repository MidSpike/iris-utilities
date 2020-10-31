'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TEST',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'used for testing purposes',
    aliases: ['test'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title: `Hello World! I'm ${client.user.username}!`,
        }));
    },
});
