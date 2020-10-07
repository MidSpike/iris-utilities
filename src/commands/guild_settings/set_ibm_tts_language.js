'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const ibm_languages_json = require('../../../files/ibm_languages.json');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_IBM_TTS_LANGUAGE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight:9,
    description:'sets ibm tts language',
    aliases:['set_ibm_tts_language'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        if (command_args[0]) {
            const old_tts_language = guild_config.tts_voice_ibm;
            const new_tts_language = command_args[0];
            if (Object.keys(ibm_languages_json).includes(new_tts_language)) {
                message.channel.send(new CustomRichEmbed({
                    title:`Setting New IBM TTS Language`,
                    description:`Old Server IBM TTS Language: ${'```'}\n${old_tts_language}\n${'```'}\nNew Server IBM TTS Language: ${'```'}\n${new_tts_language}\n${'```'}`
                }, message));
                client.$.guild_configs_manager.updateConfig(message.guild.id, {
                    tts_voice_ibm:new_tts_language
                });
            } else {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`That's not a valid IBM TTS language`
                }, message));
            }
        } else {
            message.channel.send([
                `Please provide a new ibm_tts_language after the command next time!`,
                `Example: ${'```'}\n${discord_command} en-US_EmilyV3Voice\n${'```'}`,
                `Use command \`${command_prefix}langcodes ibm\` for a list of supported voices!`
            ].join('\n'));
        }
    },
});
