'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_IBM_TTS_LANGUAGE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'sets ibm tts language',
    aliases:['set_ibm_tts_language'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args, guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        if (command_args[0]) {
            const old_tts_language = guild_config.tts_voice_ibm;
            const new_tts_language = command_args[0];
            message.channel.send(new CustomRichEmbed({
                title:`Setting New IBM TTS Language`,
                description:`Old Server IBM TTS Language: ${'```'}\n${old_tts_language}\n${'```'}\nNew Server IBM TTS Language: ${'```'}\n${new_tts_language}\n${'```'}`
            }, message));
            guild_config_manipulator.modifyConfig({
                tts_voice_ibm:new_tts_language
            });
        } else {
            message.channel.send(`Please provide a new ibm_tts_language after the command next time!`);
            message.channel.send(`Example: ${'```'}\n${discord_command} en-US_EmilyV3Voice\n${'```'}`);
            message.channel.send(`Use command \`${command_prefix}langcodes ibm\` for a list of supported voices!`);
        }
    },
});
