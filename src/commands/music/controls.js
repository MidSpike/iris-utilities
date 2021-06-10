'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendMusicControllerEmbed } = require('../../libs/messages.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'CONTROLS',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 3,
    description: 'Opens the music controls menu',
    aliases: ['controls', 'c'],
    cooldown: 5_000,
    async executor(Discord, client, message, opts={}) {
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length > 0) {
            sendMusicControllerEmbed(message.channel.id, message);
        } else {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Nothing is playing right now!',
                    description: 'Try using this command when I\'m playing something!',
                }, message),
            });
        }
    },
});
