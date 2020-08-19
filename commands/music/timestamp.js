'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TIMESTAMP',
    category:`${DisBotCommander.categories.MUSIC}`,
    description:'Tells the user the timestamp of what is currently playing',
    aliases:['timestamp', 'ts'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        if (server.queue_manager.queue.length > 0) {
            message.channel.send(new CustomRichEmbed({
                title:`The Current Queue Item Timestamp Is: ${server.audio_controller.timestamp}`
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Uh Oh! What are you doing there mate!`,
                description:`Nothing is playing right now!\nTry using this command when I'm playing something!`
            }, message));
        }
    },
});
