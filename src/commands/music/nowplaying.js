'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendYtDiscordEmbed } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'NOWPLAYING',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:11,
    description:'Tells the user what is currently playing',
    aliases:['nowplaying', 'np'],
    async executor(Discord, client, message, opts={}) {
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);
        if (guild_queue_manager.queue.length > 0) {
            if (guild_queue_manager.queue[0].type === 'youtube') {
                sendYtDiscordEmbed(message, guild_queue_manager.queue[0].metadata.videoInfo, 'Currently Playing');
            } else if (guild_queue_manager.queue[0].type === 'tts') {
                message.channel.send(new CustomRichEmbed({
                    title:`Currently Playing: ${guild_queue_manager.queue[0].type.toUpperCase()}`,
                    description:`${guild_queue_manager.queue[0].metadata.text.slice(0, 50)}`
                }));
            } else if (guild_queue_manager.queue[0].type === 'mp3') {
                message.channel.send(new CustomRichEmbed({
                    title:`Currently Playing: ${guild_queue_manager.queue[0].type.toUpperCase()}`,
                    description:`${guild_queue_manager.queue[0].metadata.mp3_file_name}`
                }));
            } else {
                message.channel.send(new CustomRichEmbed({
                    title:`Currently Playing: ${guild_queue_manager.queue[0].type.toUpperCase()}`
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
