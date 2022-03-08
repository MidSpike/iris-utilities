'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../common/app/message');
const { AudioManager, VolumeManager } = require('../common/app/audio');

//------------------------------------------------------------//

module.exports = {
    name: 'speech',
    /**
     * @param {Discord.Client} discord_client
     * @param {{
     *  content: string?,
     *  channel: Discord.VoiceChannel?,
     *  author: Discord.User?,
     * }} msg
     */
    async handler(discord_client, msg) {
        if (!msg?.content?.length) return;

        console.log({
            voice_recognition: msg.content,
        });

        const voice_command_activation_regex = /^(\b(hey|a|play|yo|yellow|ok|okay|oi)\b\s)?\b(Ir(i?)s(h?)|Discord|Ziggy|Alexa|Google|Siri|Bixby|Cortana|Tesla)\b/gi;

        if (!voice_command_activation_regex.test(msg.content)) return;

        console.log({
            voice_message: {
                content: msg.content,
                author_id: msg.author.id,
                voice_channel_id: msg.channel.id,
            },
        });

        /** @type {string} */
        const user_input = msg.content.replace(voice_command_activation_regex, '').toLowerCase().trim();
        const user_input_args = user_input.split(/\s+/gi);

        const voice_command_name = user_input_args[0] ?? '';
        const voice_command_args = user_input_args.slice(1) ?? [];

        if (!voice_command_name.length) return;

        const voice_command_text_channel = discord_client.channels.cache.get('909136093516029972');

        await voice_command_text_channel.send({
            embeds: [
                new CustomEmbed({
                    title: 'Voice Command',
                    description: `${msg.author.username} said:\`\`\`\n${voice_command_name} ${voice_command_args.join(' ')}\n\`\`\``,
                }),
            ],
        }).catch(console.warn);

        switch (voice_command_name) {
            case 'by': // this is needed b/c google sometimes picks up 'by' instead of 'play'
            case 'hey': // this is needed b/c google sometimes picks up 'hey' instead of 'play'
            case 'play': {
                const queue = await AudioManager.createQueue(discord_client, msg.channel.guild.id, {
                    user: msg.author,
                    channel: voice_command_text_channel,
                });

                const search_result = await queue.player.search(`${voice_command_args.join(' ')}`, {
                    requestedBy: msg.author,
                }).catch(() => {});

                if (!search_result?.tracks?.length) return;

                if (!queue.connection) {
                    await queue.connect(msg.channel.id);
                }

                queue.play(search_result.tracks[0]);

                break;
            }

            case 'vol': // this is needed b/c google sometimes picks up 'vol' instead of 'volume'
            case 'volume': {
                const volume_input = Number.parseInt(voice_command_args[0], 10);

                if (Number.isNaN(volume_input)) return;

                const minimum_allowed_volume = 0;
                const maximum_allowed_volume = 100;
                const volume_level = Math.max(minimum_allowed_volume, Math.min(volume_input, maximum_allowed_volume));

                const queue = await AudioManager.fetchQueue(discord_client, msg.channel.guild.id);
                queue.setVolume(VolumeManager.scaleVolume(VolumeManager.lockToNearestMultipleOf(volume_level, 5)));

                break;
            }

            case 'skit': // this is needed b/c google sometimes picks up 'skit' instead of 'skip'
            case 'skin': // this is needed b/c google sometimes picks up 'skin' instead of 'skip'
            case 'skip': {
                const queue = await AudioManager.fetchQueue(discord_client, msg.channel.guild.id);
                queue.skip();

                break;
            }

            case 'star': // this is needed b/c google sometimes picks up 'star' instead of 'stop'
            case 'stop': {
                const queue = await AudioManager.fetchQueue(discord_client, msg.channel.guild.id);
                queue.stop();

                break;
            }

            default: {
                break;
            }
        }
    },
};
