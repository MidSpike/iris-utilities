'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_common_name = bot_config.COMMON_NAME;

module.exports = new DisBotCommand({
    name:'RESUME',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:6,
    description:'Resumes anything that the bot is playing',
    aliases:['resume'],
    async executor(Discord, client, message, opts={}) {
        const guild_audio_controller = client.$.audio_controllers.get(message.guild.id);

        if (message.guild.voice) {
            guild_audio_controller.resume();
            message.channel.send(new CustomRichEmbed({
                title:`Controlling ${bot_common_name}`,
                description:'Resumed The Music'
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Oi! I'm not connected to a voice channel!`,
                description:`Try playing something first!`
            }, message));
        }
    },
});
