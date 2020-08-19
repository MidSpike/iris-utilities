'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');
const { sendYtDiscordEmbed } = require('../../src/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'NOWPLAYING',
    category:`${DisBotCommander.categories.MUSIC}`,
    description:'Tells the user what is currently playing',
    aliases:['nowplaying', 'np'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        if (server.queue_manager.queue.length > 0) {
            if (server.queue_manager.queue[0].type === 'youtube') {
                sendYtDiscordEmbed(message, server.queue_manager.queue[0].metadata.videoInfo, 'Currently Playing');
            } else if (server.queue_manager.queue[0].type === 'tts') {
                message.channel.send(new CustomRichEmbed({
                    title:`Currently Playing: ${server.queue_manager.queue[0].type.toUpperCase()}`,
                    description:`${server.queue_manager.queue[0].metadata.text.slice(0, 50)}`
                }));
            } else if (server.queue_manager.queue[0].type === 'mp3') {
                message.channel.send(new CustomRichEmbed({
                    title:`Currently Playing: ${server.queue_manager.queue[0].type.toUpperCase()}`,
                    description:`${server.queue_manager.queue[0].metadata.mp3_file_name}`
                }));
            } else {
                message.channel.send(new CustomRichEmbed({
                    title:`Currently Playing: ${server.queue_manager.queue[0].type.toUpperCase()}`
                }));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Uh Oh! What are you doing there mate!`,
                description:`Nothing is playing right now!\nTry using this command when I'm playing something!`
            }, message));
        }
    },
});
