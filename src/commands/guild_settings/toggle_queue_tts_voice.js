'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_QUEUE_TTS_VOICE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight:14,
    description:'toggles queue tts voice',
    aliases:['toggle_queue_tts_voice'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const queue_tts_voice = guild_config.queue_tts_voice === 'enabled';
        if (queue_tts_voice === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Queue TTS Voice: disabled;`,
                description:`I will no longer use TTS to announce the next item in the queue before it plays.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                queue_tts_voice:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Queue TTS Voice: enabled;`,
                description:`I will use TTS to announce the next item in the queue before it plays.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                queue_tts_voice:'enabled'
            });
        }
    },
});
