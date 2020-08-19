'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');

const bot_config = require('../../config.json');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;

module.exports = new DisBotCommand({
    name:'RESUME',
    category:`${DisBotCommander.categories.MUSIC}`,
    description:'Resumes anything that the bot is playing',
    aliases:['resume'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        if (message.guild.voice) {
            server.audio_controller.resume();
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
