'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_DISCONNECT_TTS_VOICE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles disconnect tts voice',
    aliases:['toggle_disconnect_tts_voice'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        const disconnect_tts_voice = guild_config.disconnect_tts_voice === 'enabled';
        if (disconnect_tts_voice === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Disconnect TTS Voice: disabled;`,
                description:`I will no longer use TTS to say something when I leave the voice channel.`
            }, message));
            guild_config_manipulator.modifyConfig({
                disconnect_tts_voice:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Disconnect TTS Voice: enabled;`,
                description:`I will use TTS to say something when I leave the voice channel.`
            }, message));
            guild_config_manipulator.modifyConfig({
                disconnect_tts_voice:'enabled'
            });
        }
    },
});
