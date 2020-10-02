'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const bot_config = require('../../../config.js');
//#endregion local dependencies

const bot_common_name = bot_config.COMMON_NAME;

module.exports = new DisBotCommand({
    name: 'SUMMON',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 13,
    description: 'Summons the bot to your voice channel',
    aliases: ['summon', 'join'],
    async executor(Discord, client, message, opts = {}) {
        const { command_args } = opts;
        const voice_channel_to_join = message.guild.channels.cache.get(command_args[0]) ?? message.member.voice.channel;
        if (!voice_channel_to_join) {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        color: 0xffff00,
                        title: `Oi! What are you doing mate!`,
                        description: `Get in a voice channel before summoning me!`,
                    },
                    message,
                ),
            );
            return;
        }
        voice_channel_to_join
            .join()
            .then(() => {
                message.channel.send(
                    new CustomRichEmbed(
                        {
                            title: `Controlling ${bot_common_name}`,
                            description: `Summoned ${bot_common_name} to their channel`,
                        },
                        message,
                    ),
                );
            })
            .catch(() => {
                message.channel.send(
                    new CustomRichEmbed(
                        {
                            color: 0xffff00,
                            title: `Oi! What happened!`,
                            description: `I can't join that voice channel!`,
                        },
                        message,
                    ),
                );
            });
    },
});
