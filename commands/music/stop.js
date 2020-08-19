'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');

const bot_config = require('../../config.json');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;

module.exports = new DisBotCommand({
    name:'STOP',
    // category:`${DisBotCommander.categories.MUSIC_LEAVE}`,
    category:`${DisBotCommander.categories.MUSIC}`,
    description:'Stops music playback and disconnects the bot from the voice channel',
    aliases:['stop', 'bye', 'fuckoff', '#{cp}'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        message.channel.send(new CustomRichEmbed({
            title:`Controlling ${bot_common_name}`,
            description:`Told ${bot_common_name} to leave their voice channel.`
        }, message));
        server.audio_controller.disconnect();
    },
});
