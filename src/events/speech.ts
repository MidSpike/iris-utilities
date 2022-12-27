//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import * as DiscordSpeechRecognition from '@midspike/discord-speech-recognition';

import { GoogleTranslateTTS } from 'google-translate-tts';

import { MusicReconnaissance, TrackSpace, music_subscriptions } from '@root/common/app/music/music';

import { CustomEmbed } from '@root/common/app/message';

//------------------------------------------------------------//

const ibm_tts_api_url = process.env.IBM_TTS_API_URL as string;
if (!ibm_tts_api_url?.length) throw new Error('IBM_TTS_API_URL is not defined or is empty');

//------------------------------------------------------------//

export default {
    name: DiscordSpeechRecognition.Events.VoiceMessage,
    async handler(
        discord_client: Discord.Client,
        voice_message: DiscordSpeechRecognition.VoiceMessage,
    ) {
        if (!discord_client.isReady()) return;

        if (!voice_message?.content?.length) return;
        if (!voice_message?.channel) return;
        if (!voice_message?.userId) return;

        console.log({
            voice_recognition: voice_message.content,
        });

        const voice_command_activation_regex = /^(\b(hey|a|play|yo|yellow|ok|okay|oi)\b\s)?\b(Ir(i?)s(h?)|Discord|Disco|Ziggy|Alexa|Google|Siri|Bixby|Cortana|Tesla)\b/gi;

        if (!voice_command_activation_regex.test(voice_message.content)) return;

        console.log({
            voice_command_detected: {
                content: voice_message.content,
                author_id: voice_message.userId,
                voice_channel_id: voice_message.channel?.id,
            },
        });

        const voice_channel = await discord_client.channels.fetch(voice_message.channel.id) as Discord.VoiceChannel;
        if (!voice_channel) return;

        const guild = await voice_channel.guild.fetch();
        if (!guild) return;

        const guild_member = await guild.members.fetch(voice_message.userId);
        if (!guild_member) return;

        const guild_member_voice_channel_id = guild_member.voice.channelId;
        if (!guild_member_voice_channel_id) return;

        const bot_member = await guild.members.fetchMe();

        const bot_voice_channel_id = bot_member.voice.channelId;
        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) return;

        const user_input = voice_message.content.replace(voice_command_activation_regex, '').toLowerCase().trim();
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
                    description: `${guild_member.user.username} said:\`\`\`\n${voice_command_name} ${voice_command_args.join(' ')}\n\`\`\``,
                }),
            ],
        }).catch(console.warn);

        switch (voice_command_name) {
            case 'say': {
                const tts_text = voice_command_args.join(' ');

                const track: TrackSpace.TextToSpeechTrack = new TrackSpace.TextToSpeechTrack({
                    metadata: {
                        title: 'Voice Command',
                        tts_text: tts_text,
                        tts_provider: 'google',
                        tts_voice: 'en-US',
                    },
                    stream_creator: async () => {
                        const gt_tts = new GoogleTranslateTTS({
                            language: track.metadata.tts_voice,
                            text: track.metadata.tts_text,
                        });

                        const stream = await gt_tts.stream();

                        return stream;
                    },
                });

                // Add the track and reply a success message to the user
                music_subscription.queue.addTrack(track);

                // Process the music subscription's queue
                await music_subscription.processQueue(false);

                break;
            }

            case 'by': // fallback for improper recognition
            case 'hey': // fallback for improper recognition
            case 'play': {
                const search_query = voice_command_args.join(' ');

                const search_results = await MusicReconnaissance.search(search_query, 'soundcloud');
                if (search_results.length === 0) return;

                const track = search_results.at(0);
                if (!track) return;

                track.onStart((track) => {
                    music_subscription.text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command',
                                description: `${guild_member.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                            }),
                        ],
                    }).catch(console.warn);
                });

                track.onFinish((track) => {
                    music_subscription.text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command',
                                description: `${guild_member.user}, finished playing **${track.metadata.title}**.`,
                            }),
                        ],
                    }).catch(console.warn);
                });

                track.onError((track, error) => {
                    console.trace(error);

                    music_subscription.text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command',
                                color: CustomEmbed.colors.RED,
                                description: `${guild_member.user}, failed to play **${track.metadata.title}**.`,
                            }),
                        ],
                    }).catch(console.warn);
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
                            description: `${guild_member.user}, set the volume to **${volume_level}%**.`,
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
                            description: `${guild_member.user}, skipped the current track.`,
                        }),
                    ],
                }).catch(console.warn);

                music_subscription.processQueue(true);

                break;
            }

            case 'disconnect':
            case 'star': // fallback for improper recognition
            case 'stop': {
                music_subscription.text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${guild_member.user}, stopped the queue.`,
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
