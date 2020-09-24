'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_DISCONNECT_TTS_VOICE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles disconnect tts voice',
    aliases:['toggle_disconnect_tts_voice'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const disconnect_tts_voice = guild_config.disconnect_tts_voice === 'enabled';
        if (disconnect_tts_voice === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Disconnect TTS Voice: disabled;`,
                description:`I will no longer use TTS to say something when I leave the voice channel.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                disconnect_tts_voice:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Disconnect TTS Voice: enabled;`,
                description:`I will use TTS to say something when I leave the voice channel.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                disconnect_tts_voice:'enabled'
            });
        }
    },
});
