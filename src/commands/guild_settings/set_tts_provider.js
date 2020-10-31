'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SET_TTS_PROVIDER',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 7,
    description: 'sets tts provider',
    aliases: ['set_tts_provider'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        const supported_tts_providers = [
            'ibm',
            'google',
        ];

        if (command_args[0]) {
            const old_tts_provider = guild_config.tts_provider;
            const new_tts_provider = command_args[0];

            if (supported_tts_providers.includes(new_tts_provider)) {
                message.channel.send(new CustomRichEmbed({
                    title: 'Setting TTS Provider',
                    description: [
                        `Old Server TTS Provider: ${'```'}\n${old_tts_provider}\n${'```'}`,
                        `New Server TTS Provider: ${'```'}\n${new_tts_provider}\n${'```'}`,
                    ].join('\n'),
                }, message));
                client.$.guild_configs_manager.updateConfig(message.guild.id, {
                    tts_provider: new_tts_provider,
                });
            } else {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'That\'s not a valid TTS Provider',
                    description: '\`google\` and \`ibm\` are the only supported providers!',
                }, message));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                title: 'Please provide a new tts_provider after the command next time!',
                fields: [
                    {
                        name: 'Example',
                        value: `${'```'}\n${discord_command} ibm\n${'```'}`,
                    }, {
                        name: 'Supported tts_providers',
                        value: supported_tts_providers.map(supported_tts_provider => `- \`${supported_tts_provider}\``).join('\n'),
                    },
                ],
            }, message));
        }
    },
});
