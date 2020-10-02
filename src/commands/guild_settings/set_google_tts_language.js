'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const google_languages_json = require('../../../files/google_languages.json');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'SET_GOOGLE_TTS_LANGUAGE',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    description: 'sets google tts language',
    aliases: ['set_google_tts_language'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts = {}) {
        const { command_prefix, discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        if (command_args[0]) {
            const old_tts_language = guild_config.tts_voice_google;
            const new_tts_language = command_args[0];
            if (Object.keys(google_languages_json).includes(new_tts_language)) {
                message.channel.send(
                    new CustomRichEmbed(
                        {
                            title: `Setting New Google TTS Language`,
                            description: `Old Server Google TTS Language: ${'```'}\n${old_tts_language}\n${'```'}\nNew Server Google TTS Language: ${'```'}\n${new_tts_language}\n${'```'}`,
                        },
                        message,
                    ),
                );
                client.$.guild_configs_manager.updateConfig(message.guild.id, {
                    tts_voice_google: new_tts_language,
                });
            } else {
                message.channel.send(
                    new CustomRichEmbed(
                        {
                            color: 0xffff00,
                            title: `That's not a valid Google TTS language`,
                        },
                        message,
                    ),
                );
            }
        } else {
            message.channel.send(
                [
                    `Please provide a new google_tts_language after the command next time!`,
                    `Example: ${'```'}\n${discord_command} en-us\n${'```'}`,
                    `Use command \`${command_prefix}langcodes google\` for a list of supported voices!`,
                ].join('\n'),
            );
        }
    },
});
