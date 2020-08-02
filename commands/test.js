'use strict';

//#region Local Dependencies
const { CustomRichEmbed } = require('../src/CustomRichEmbed.js');
const { DisBotCommand } = require('../src/DisBotCommander.js');
//#endregion

module.exports = new DisBotCommand('TEST', ['test'], (client, message, opts) => {
    message.channel.send(new CustomRichEmbed({
        title:`Hello World! I'm ${client.user.username}!`
    }));
});
