//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import * as DiscordSpeechRecognition from '@midspike/discord-speech-recognition';

import { GoogleTranslateTTS } from 'google-translate-tts';

import { EnvironmentVariableName, arrayChunks, delay, parseEnvironmentVariable } from '@root/common/lib/utilities';

import { MusicReconnaissance, TrackSpace, music_subscriptions } from '@root/common/app/music/music';

import { CustomEmbed } from '@root/common/app/message';

import { doesUserHaveArtificialIntelligenceAccess } from '@root/common/app/permissions';

//------------------------------------------------------------//

const ibm_tts_api_url = parseEnvironmentVariable(EnvironmentVariableName.IbmTextToSpeechApiUrl, 'string');

const ibm_tts_api_key = parseEnvironmentVariable(EnvironmentVariableName.IbmTextToSpeechApiKey, 'string');

const openai_usage = parseEnvironmentVariable(EnvironmentVariableName.OpenAiUsage, 'string');

const openai_api_key = parseEnvironmentVariable(EnvironmentVariableName.OpenAiApiKey, 'string');

//------------------------------------------------------------//

const base64_encoded_ibm_tts_api_key = Buffer.from(`apikey:${ibm_tts_api_key}`, 'utf8').toString('base64');

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

        const text_channel = await discord_client.channels.fetch(music_subscription.text_channel_id);
        if (!text_channel) return;
        if (!text_channel.isTextBased()) return;

        await text_channel.send({
            embeds: [
                CustomEmbed.from({
                    title: 'Voice Command',
                    description: `${guild_member.user.username} said:\`\`\`\n${voice_command_name} ${voice_command_args.join(' ')}\n\`\`\``,
                }),
            ],
        }).catch(console.warn);

        switch (voice_command_name) {
            case 'tpt':
            case 'cpt':
            case 'gpt': {
                if (openai_usage !== 'enabled') return; // don't respond if openai is not enabled

                const is_user_allowed_to_use_gpt = await doesUserHaveArtificialIntelligenceAccess(guild_member.user.id);
                if (!is_user_allowed_to_use_gpt) {
                    await text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command - GPT-3.5-Turbo',
                                description: `${guild_member.user}, you do not have permission to use GPT.`,
                            }),
                        ],
                    }).catch(console.warn);

                    return;
                }

                const user_prompt = voice_command_args.join(' ');

                // impose harsh limits on the user prompt
                // to prevent abuse of the gpt api
                if (
                    user_prompt.length < 1 ||
                    user_prompt.length > 128
                ) return;

                const gpt_response = await axios({
                    method: 'POST',
                    url: 'https://api.openai.com/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${openai_api_key}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        'model': 'gpt-3.5-turbo',
                        'messages': [
                            {
                                'role': 'system',
                                'content': 'You are Iris, be extremely concise.',
                            },
                            {
                                'role': 'user',
                                'content': user_prompt,
                            },
                        ],
                        'max_tokens': 64, // prevent lengthy responses from being generated
                    },
                    validateStatus: (status) => true,
                });

                if (gpt_response.status !== 200) {
                    console.warn('Failed to generate a response from GPT:', {
                        'response': gpt_response,
                        'response_data': gpt_response.data,
                    });

                    return;
                }

                type GPTResponseData = {
                    choices: {
                        index: number,
                        message: {
                            role: string,
                            content: string,
                        },
                        finish_reason: string,
                    }[],
                    usage: {
                        total_tokens: number,
                    },
                };

                const gpt_response_data = gpt_response.data as GPTResponseData;
                const gpt_response_message = gpt_response_data?.choices?.[0]?.message?.content ?? 'Failed to generate a response.';
                const gpt_response_total_tokens = gpt_response_data?.usage?.total_tokens ?? 0;

                text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command - GPT-3.5-Turbo',
                            description: [
                                `${guild_member.user}, interacted with GPT for ${gpt_response_total_tokens} tokens.`,
                                '\`\`\`',
                                gpt_response_message,
                                '\`\`\`',
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);

                const tts_text_chunks = arrayChunks(
                    gpt_response_message.split(/\s/g),
                    64,
                ).map((chunk) => chunk.join(' '));

                for (const tts_text of tts_text_chunks) {
                    const tts_provider = 'ibm';
                    const tts_voice = 'en-US_EmmaExpressive';

                    const track: TrackSpace.TextToSpeechTrack = new TrackSpace.TextToSpeechTrack({
                        metadata: {
                            title: 'Voice Command - GPT-3.5-Turbo',
                            tts_text: tts_text,
                            tts_provider: tts_provider,
                            tts_voice: tts_voice,
                        },
                        stream_creator: async () => {
                            const response = await axios({
                                method: 'post',
                                url: `${ibm_tts_api_url}/v1/synthesize?voice=${encodeURIComponent(tts_voice)}`,
                                headers: {
                                    'Accept': 'audio/wav',
                                    'Authorization': `Basic ${base64_encoded_ibm_tts_api_key}`,
                                    'Content-Type': 'application/json',
                                },
                                responseType: 'stream',
                                timeout: 10_000, // 10 seconds
                                data: {
                                    'text': tts_text,
                                },
                            });

                            return response.data;
                        },
                    });

                    // Add the track and reply a success message to the user
                    music_subscription.queue.addTrack(track);

                    // Process the music subscription's queue forcibly
                    await music_subscription.processQueue(false);

                    await delay(3_000); // 3 seconds
                }

                break;
            }

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

                const search_results = await MusicReconnaissance.search(search_query, 'youtube');
                if (search_results.length === 0) return;

                const track = search_results.at(0);
                if (!track) return;

                void track.onStart(async (track) => {
                    text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command',
                                description: `${guild_member.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                            }),
                        ],
                    }).catch(console.warn);
                });

                void track.onFinish(async (track) => {
                    text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command',
                                description: `${guild_member.user}, finished playing **${track.metadata.title}**.`,
                            }),
                        ],
                    }).catch(console.warn);
                });

                void track.onError(async (track, error) => {
                    console.trace(error);

                    text_channel.send({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Voice Command',
                                color: CustomEmbed.Colors.Red,
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
                const volume_input = voice_command_args.join(' ');

                const parsed_volume_input = parseInt(volume_input, 10);
                if (Number.isNaN(parsed_volume_input)) return;

                const minimum_allowed_volume = 0;
                const maximum_allowed_volume = 100;
                const volume_level = Math.max(minimum_allowed_volume, Math.min(parsed_volume_input, maximum_allowed_volume));

                text_channel.send({
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

            case 'paws': // fallback for improper recognition
            case 'pause': {
                text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${guild_member.user}, paused the current track.`,
                        }),
                    ],
                }).catch(console.warn);

                music_subscription.queue.state_manager.pause();

                break;
            }

            case 'resumes': // fallback for improper recognition
            case 'resume': {
                text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${guild_member.user}, resumed the current track.`,
                        }),
                    ],
                }).catch(console.warn);

                music_subscription.queue.state_manager.resume();

                break;
            }

            case 'skit': // fallback for improper recognition
            case 'skin': // fallback for improper recognition
            case 'skip': {
                text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${guild_member.user}, skipped the current track.`,
                        }),
                    ],
                }).catch(console.warn);

                await music_subscription.processQueue(true);

                break;
            }

            case 'disconnect':
            case 'star': // fallback for improper recognition
            case 'stop': {
                text_channel.send({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Voice Command',
                            description: `${guild_member.user}, stopped the queue.`,
                        }),
                    ],
                }).catch(console.warn);

                music_subscription.stop();

                break;
            }

            default: {
                break;
            }
        }
    },
};
