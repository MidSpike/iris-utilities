'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_TTS_PROVIDER',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'sets tts provider',
    aliases:['set_tts_provider'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args, guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        if (command_args[0]) {
            const old_tts_provider = guild_config.tts_provider;
            const new_tts_provider = command_args[0];
            if (['ibm', 'google'].includes(new_tts_provider)) {
                message.channel.send(new CustomRichEmbed({
                    title:`Setting TTS Provider`,
                    description:`Old Server TTS Provider: ${'```'}\n${old_tts_provider}\n${'```'}\nNew Server TTS Provider: ${'```'}\n${new_tts_provider}\n${'```'}`
                }, message));
                guild_config_manipulator.modifyConfig({
                    tts_provider:new_tts_provider
                });
            } else {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`That's not a valid TTS Provider\nOnly: \`google\` and \`ibm\` are valid providers!`
                }, message));
            }
        } else {
            message.channel.send([
                `Please provide a new tts_provider after the command next time!`,
                `Example: ${'```'}\n${discord_command} ibm\n${'```'}`
            ].join('\n'));
        }
    },
});
