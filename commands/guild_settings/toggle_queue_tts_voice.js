'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_QUEUE_TTS_VOICE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles queue tts voice',
    aliases:['toggle_queue_tts_voice'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        const queue_tts_voice = guild_config.queue_tts_voice === 'enabled';
        if (queue_tts_voice === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Queue TTS Voice: disabled;`,
                description:`I will no longer use TTS to announce the next item in the queue before it plays.`
            }, message));
            guild_config_manipulator.modifyConfig({
                queue_tts_voice:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Queue TTS Voice: enabled;`,
                description:`I will use TTS to announce the next item in the queue before it plays.`
            }, message));
            guild_config_manipulator.modifyConfig({
                queue_tts_voice:'enabled'
            });
        }
    },
});
