'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendMusicControllerEmbed } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'LOOP',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:3,
    description:'Loops the first song in the queue',
    aliases:['loop', 'l'],
    async executor(Discord, client, message, opts={}) {
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length > 0) {
            guild_queue_manager.queue.loop
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Uh Oh! What are you doing there mate!`,
                description:`Nothing is playing right now!\nTry using this command when I'm playing something!`
            }, message));
        }
    },
});
