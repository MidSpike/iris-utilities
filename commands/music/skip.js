'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');

const bot_config = require('../../config.json');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;

module.exports = new DisBotCommand({
    name:'SKIP',
    category:`${DisBotCommander.categories.MUSIC}`,
    description:'Allows skipping a song',
    aliases:['skip', 's', 'next', 'n'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        message.channel.send(new CustomRichEmbed({
            title:`Controlling ${bot_common_name}`,
            description:`Skipped the current song!`
        }, message));
        server.audio_controller.skip();
    },
});
