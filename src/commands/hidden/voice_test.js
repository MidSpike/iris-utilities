'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    AudioPlayerStatus,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'VOICE_TEST',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'used for testing purposes',
    aliases: ['voice_test'],
    cooldown: 5_000,
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title: `Hello World! This is a test!`,
        }));
        
    },
});
