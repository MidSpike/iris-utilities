'use strict';

//------------------------------------------------------------//

import stream from 'node:stream';

import axios from 'axios';

import Discord from 'discord.js';

import { VoiceConnectionStatus, createAudioResource, demuxProbe, entersState, joinVoiceChannel } from '@discordjs/voice';

import { CustomEmbed } from '../../../../common/app/message';

import { MusicSubscription, TextToSpeechTrack, music_subscriptions } from '../../../../common/app/music/music';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

import { array_chunks, delay, string_ellipses } from '../../../../common/lib/utilities';

import { GoogleTranslateTTS } from 'google-translate-tts';

//------------------------------------------------------------//

const voice_codes = [
    { provider: 'google', name: 'Google - English (United Kingdom)', code: 'en-GB' },
    { provider: 'google', name: 'Google - English (United States)', code: 'en-US' },
    { provider: 'google', name: 'Google - English (Australia)', code: 'en-AU' },
    { provider: 'google', name: 'Google - Deutsch (Deutschland)', code: 'de' },
    { provider: 'google', name: 'Google - Nederlands (Nederland)', code: 'nl' },
    { provider: 'ibm', name: 'IBM Kate - English (United Kingdom)', code: 'en-GB_KateV3Voice' },
    { provider: 'ibm', name: 'IBM James - English (United Kingdom)', code: 'en-GB_JamesV3Voice' },
    { provider: 'ibm', name: 'IBM Charlotte - English (United Kingdom)', code: 'en-GB_CharlotteV3Voice' },
    { provider: 'ibm', name: 'IBM Allison - English (United States)', code: 'en-US_AllisonV3Voice' },
    { provider: 'ibm', name: 'IBM Emily - English (United States)', code: 'en-US_EmilyV3Voice' },
    { provider: 'ibm', name: 'IBM Henry - English (United States)', code: 'en-US_HenryV3Voice' },
    { provider: 'ibm', name: 'IBM Kevin - English (United States)', code: 'en-US_KevinV3Voice' },
    { provider: 'ibm', name: 'IBM Lisa - English (United States)', code: 'en-US_LisaV3Voice' },
    { provider: 'ibm', name: 'IBM Michael - English (United States)', code: 'en-US_MichaelV3Voice' },
    { provider: 'ibm', name: 'IBM Olivia - English (United States)', code: 'en-US_OliviaV3Voice' },
    { provider: 'ibm', name: 'IBM Birgit - Deutsch (Deutschland)', code: 'de-DE_BirgitV3Voice' },
    { provider: 'ibm', name: 'IBM Dieter - Deutsch (Deutschland)', code: 'de-DE_DieterV3Voice' },
    { provider: 'ibm', name: 'IBM Erika - Deutsch (Deutschland)', code: 'de-DE_ErikaV3Voice' },
];

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'tts',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'allows for text to speech',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'text',
                description: 'the text to speak',
                required: true,
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'voice',
                description: 'the voice to use',
                required: false,
                choices: voice_codes.map(code => ({
                    name: code.name,
                    value: `${code.provider}:${code.code}`,
                })),
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('FUN_STUFF'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const text = interaction.options.getString('text', true);
        const provider_voice = interaction.options.getString('voice', false) ?? 'ibm:en-GB_KateV3Voice';

        const member = await interaction.guild!.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;
        const bot_voice_channel_id = interaction.guild.me!.voice.channelId;

        if (!guild_member_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            return interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to summon me or join my voice channel.`,
                    }),
                ],
            });
        }

        let music_subscription: MusicSubscription | undefined = music_subscriptions.get(interaction.guildId);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription(
                joinVoiceChannel({
                    channelId: guild_member_voice_channel_id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator as any, // to make typescript happy
                    selfDeaf: false,
                })
            );
            music_subscriptions.set(interaction.guildId, music_subscription);
        }

        // Make sure the connection is ready before processing the user's request
        try {
            await entersState(music_subscription.voice_connection, VoiceConnectionStatus.Ready, 10e3);
        } catch (error) {
            console.warn(error);

            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't connect to the voice channel.`,
                    }),
                ],
            });

            return;
        }

        const tts_text_chunks = array_chunks(text.split(/\s/g), 50).map(chunk => chunk.join(' '));

        if (tts_text_chunks.length > 1) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, added ${tts_text_chunks.length} tts chunks to the queue.`,
                    }),
                ],
            });
        } else {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, added text-to-speech to the queue:\`\`\`\n${string_ellipses(text, 512)}\n\`\`\``,
                    }),
                ],
            });
        }

        for (let i = 0; i < tts_text_chunks.length; i++) {
            const tts_text = tts_text_chunks[i];

            const [ provider, voice ] = provider_voice.split(':');

            const track = new TextToSpeechTrack({
                title: `${interaction.user}'s TTS Message`,
                tts_text: tts_text,
                tts_provider: provider,
                tts_voice: voice,
            }, () => new Promise(async (resolve, reject) => {
                let stream: stream.Readable;

                try {
                    switch (track.metadata.tts_provider) {
                        case 'google': {
                            const gt_tts = new GoogleTranslateTTS({
                                language: track.metadata.tts_voice,
                                text: track.metadata.tts_text,
                            });

                            stream = await gt_tts.stream();

                            break;
                        }

                        case 'ibm': {
                            const response = await axios({
                                method: 'get',
                                url: `${process.env.IBM_TTS_API_URL}?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(tts_text)}&download=true&accept=audio%2Fmp3`,
                                responseType: 'stream',
                                timeout: 1 * 30_000,
                            });

                            stream = response.data;

                            break;
                        }

                        default: {
                            throw new Error(`Unknown TTS provider: ${track.metadata.tts_provider};`);
                        }
                    }
                } catch (error) {
                    console.trace(error);
                    reject(error);
                    return;
                }

                if (!stream) {
                    reject(new Error('No stdout'));
                    return;
                }

                const onError = (error: unknown) => {
                    console.trace(error);

                    stream.resume();
                    reject(error);

                    return;
                };

                demuxProbe(stream).then((probe) => {
                    resolve(createAudioResource(probe.stream, {
                        inputType: probe.type,
                        inlineVolume: true, // allows volume to be adjusted while playing
                        metadata: track, // the track
                    }));
                }).catch(onError);
            }), {
                onStart() {
                    // IMPORTANT: Initialize the volume interface
                    music_subscription!.queue.volume_manager.initialize();

                    if (i > 1) {
                        interaction.channel!.send({
                            embeds: [
                                CustomEmbed.from({
                                    description: [
                                        `${interaction.user}, playing text-to-speech:`,
                                        `\`\`\`\n${string_ellipses(tts_text, 512)}\n\`\`\``,
                                    ].join('\n'),
                                }),
                            ],
                        }).catch(console.warn);
                    }
                },
                onFinish() {
                    if (i === tts_text_chunks.length - 1) {
                        interaction.channel!.send({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, finished playing text-to-speech.`,
                                }),
                            ],
                        }).catch(console.warn);
                    }
                },
                onError(error) {
                    console.trace(error);

                    interaction.channel!.send({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.RED,
                                description: `${interaction.user}, failed to play text-to-speech.`,
                            }),
                        ],
                    }).catch(console.warn);
                },
            });

            // Add the track and reply a success message to the user
            music_subscription.queue.addTrack(track);

            // Process the music subscription's queue
            await music_subscription.processQueue(false);

            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: 'Added text to speech to the queue.',
                    }),
                ],
            });

            await delay(5_000);
        }
    },
});
