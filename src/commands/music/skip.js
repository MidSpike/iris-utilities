'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_common_name = bot_config.COMMON_NAME;

module.exports = new DisBotCommand({
    name:'SKIP',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:8,
    description:'Allows skipping a song',
    aliases:['skip', 's', 'next', 'n'],
    async executor(Discord, client, message, opts={}) {
        const guild_audio_controller = client.$.audio_controllers.get(message.guild.id);
        message.channel.send(new CustomRichEmbed({
            title:`Controlling ${bot_common_name}`,
            description:`Skipped the current song!`
        }, message));
        guild_audio_controller.skip();
    },
});
