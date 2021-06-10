'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

const bot_common_name = bot_config.COMMON_NAME;

module.exports = new DisBotCommand({
    name: 'PAUSE',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 5,
    description: 'Pauses anything that the bot is playing',
    aliases: ['pause'],
    async executor(Discord, client, message, opts={}) {
        const guild_audio_controller = client.$.audio_controllers.get(message.guild.id);

        if (message.guild.me.voice) {
            guild_audio_controller.pause();
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: `Controlling ${bot_common_name}`,
                    description: 'Paused the music!',
                }, message),
            });
        } else {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'I\'m not connected to a voice channel!',
                    description: 'Try playing something first!',
                }, message),
            });
        }
    },
});
