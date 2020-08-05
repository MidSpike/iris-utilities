'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../src/CustomRichEmbed.js');
const { DisBotCommand } = require('../src/DisBotCommander.js');
const { playYouTube } = require('../src/youtube.js');
//#endregion local dependencies

module.exports = new DisBotCommand('TEST', ['test'], (client, message, opts) => {
    // message.channel.send(new CustomRichEmbed({
    //     title:`Hello World! I'm ${client.user.username}!`
    // }));
    playYouTube(message, opts.command_args.join(' '));
});
