'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TIMESTAMP',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:14,
    description:'Tells the user the timestamp of what is currently playing',
    aliases:['timestamp', 'ts'],
    async executor(Discord, client, message, opts={}) {
        const guild_audio_controller = client.$.audio_controllers.get(message.guild.id);
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length > 0) {
            message.channel.send(new CustomRichEmbed({
                title:`The Current Queue Item Timestamp Is: ${guild_audio_controller.timestamp}`
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
