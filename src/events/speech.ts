//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { MusicReconnaissance, StreamerSpace, TrackSpace, music_subscriptions } from '@root/common/app/music/music';

import { CustomEmbed } from '@root/common/app/message';

//------------------------------------------------------------//

type VoiceMessage = {
    author: Discord.User;
    channel: Discord.VoiceChannel;
    content: string;
}

//------------------------------------------------------------//

export default {
    name: 'speech',
    async handler(
        discord_client: Discord.Client,
        msg: VoiceMessage,
    ) {
        if (!discord_client.isReady()) return;

        if (!msg?.content?.length) return;
        if (!msg?.channel) return;
        if (!msg?.author) return;

        console.log({
            voice_recognition: msg.content,
        });

        const voice_command_activation_regex = /^(\b(hey|a|play|yo|yellow|ok|okay|oi)\b\s)?\b(Ir(i?)s(h?)|Discord|Ziggy|Alexa|Google|Siri|Bixby|Cortana|Tesla)\b/gi;

        if (!voice_command_activation_regex.test(msg.content)) return;

        console.log({
            voice_command_detected: {
                content: msg.content,
                author_id: msg.author?.id,
                voice_channel_id: msg.channel?.id,
            },
        });

        const author = msg.author;
        if (!author) return;

        const voice_channel = await discord_client.channels.fetch(msg.channel.id) as Discord.VoiceChannel;
        if (!voice_channel) return;

        const guild = await voice_channel.guild.fetch();
        if (!guild) return;

        const guild_member = await guild.members.fetch(author.id);
        if (!guild_member) return;

        const guild_member_voice_channel_id = guild_member.voice.channelId;
        if (!guild_member_voice_channel_id) return;

        const bot_member = await guild.members.fetchMe();

        const bot_voice_channel_id = bot_member.voice.channelId;
        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) return;

        const user_input = msg.content.replace(voice_command_activation_regex, '').toLowerCase().trim();
        const user_input_args = user_input.split(/\s+/gi);

        const voice_command_name = user_input_args[0] ?? '';
        const voice_command_args = user_input_args.slice(1) ?? [];

        if (!voice_command_name.length) return;

        const music_subscription = music_subscriptions.get(guild.id);
        if (!music_subscription) return;

        await music_subscription.text_channel.send({
            embeds: [
                CustomEmbed.from({
                    title: 'Voice Command',
                    description: `${msg.author.username} said:\`\`\`\n${voice_command_name} ${voice_command_args.join(' ')}\n\`\`\``,
                }),
            ],
        }).catch(console.warn);

        switch (voice_command_name) {
            case 'by': // fallback for improper recognition
            case 'hey': // fallback for improper recognition
            case 'play': {
                const search_query = voice_command_args.join(' ');

                const search_results = await MusicReconnaissance.search(search_query);
                if (search_results.length === 0) return;

                const search_result = search_results.at(0);
                if (!search_result) return;

                const track: TrackSpace.YouTubeTrack = new TrackSpace.YouTubeTrack({
                    metadata: {
                        title: search_result.title,
                        url: search_result.url,
                    },
                    stream_creator: () => StreamerSpace.youtubeStream(track.metadata.url),
                    events: {
                        onStart(track) {
                            music_subscription.text_channel.send({
                                embeds: [
                                    CustomEmbed.from({
                                        title: 'Voice Command',
                                        description: `${msg.author}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                                    }),
                                ],
                            }).catch(console.warn);
                        },
                        onFinish(track) {
                            music_subscription.text_channel.send({
                                embeds: [
                                    CustomEmbed.from({
                                        title: 'Voice Command',
                                        description: `${msg.author}, finished playing **${track.metadata.title}**.`,
                                    }),
                                ],
                            }).catch(console.warn);
                        },
                        onError(track, error) {
                            console.trace(error);

                            music_subscription.text_channel.send({
                                embeds: [
                                    CustomEmbed.from({
                                        title: 'Voice Command',
                                        color: CustomEmbed.colors.RED,
                                        description: `${msg.author}, failed to play **${track.metadata.title}**.`,
                                    }),
                                ],
                            }).catch(console.warn);
                        },
                    },
                });

                // Add the track and reply a success message to the user
                music_subscription.queue.addTrack(track);

                // Process the music subscription's queue
                await music_subscription.processQueue(false);

                break;
            }

            case 'vol': // fallback for improper recognition
            case 'volume': {
                const volume_input = Number.parseInt(voice_command_args[0], 10);

                if (Number.isNaN(volume_input)) return;

                const minimum_allowed_volume = 0;
                const maximum_allowed_volume = 100;
                const volume_level = Math.max(minimum_allowed_volume, Math.min(volume_input, maximum_allowed_volume));

                music_subscription.text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${msg.author}, set the volume to **${volume_level}%**.`,
                        }),
                    ],
                }).catch(console.warn);

                // eslint-disable-next-line require-atomic-updates
                music_subscription.queue.volume_manager.volume = volume_level;


                break;
            }

            case 'skit': // fallback for improper recognition
            case 'skin': // fallback for improper recognition
            case 'skip': {
                music_subscription.text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${msg.author}, skipped the current track.`,
                        }),
                    ],
                }).catch(console.warn);

                music_subscription.processQueue(true);

                break;
            }

            case 'star': // fallback for improper recognition
            case 'stop': {
                music_subscription.text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${msg.author}, stopped the queue.`,
                        }),
                    ],
                }).catch(console.warn);

                await music_subscription.kill();

                break;
            }

            default: {
                break;
            }
        }
    },
};
