'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { disBotServers } = require('../../SHARED_VARIABLES.js');
const { sendMusicControllerEmbed } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'CONTROLS',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:3,
    description:'Opens the music controls menu',
    aliases:['controls', 'c'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        if (server.queue_manager.queue.length > 0) {
            sendMusicControllerEmbed(message.channel.id, message);
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Uh Oh! What are you doing there mate!`,
                description:`Nothing is playing right now!\nTry using this command when I'm playing something!`
            }, message));
        }
    },
});
