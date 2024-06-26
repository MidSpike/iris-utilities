//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import * as fs from 'node:fs';

import * as path from 'node:path';

import { Readable } from 'node:stream';

import axios from 'axios';

import * as Discord from 'discord.js';

import { compareTwoStrings } from 'string-similarity';

import { GoogleTranslateTTS } from 'google-translate-tts';

import { EnvironmentVariableName, arrayChunks, delay, parseEnvironmentVariable, stringEllipses } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { TrackSpace, joinVoiceChannelAndEnsureMusicSubscription } from '@root/common/app/music/music';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const ibm_tts_api_url = parseEnvironmentVariable(EnvironmentVariableName.IbmTextToSpeechApiUrl, 'string');

const ibm_tts_api_key = parseEnvironmentVariable(EnvironmentVariableName.IbmTextToSpeechApiKey, 'string');

//------------------------------------------------------------//

const voices: {
    provider: 'ibm' | 'google',
    code: string,
    name: string,
}[] = JSON.parse(
    fs.readFileSync(
        path.join(process.cwd(), 'misc', 'tts_voices.json'),
        {
            encoding: 'utf8',
        }
    )
);

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'tts',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'allows for text to speech',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'text',
                description: 'the text to speak',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'voice',
                description: 'the voice to use',
                required: false,
                autocomplete: true,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.UTILITIES,
    },
    async handler(discord_client, interaction) {
        if (!interaction.inCachedGuild()) return;

        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const query_option = interaction.options.getFocused(true);

            const matching_voices = voices.map(
                (voice) => ({
                    score: Math.max(
                        (query_option.value.length <= 32 ? compareTwoStrings(query_option.value, voice.code) : 0),
                        (query_option.value.length >= 4 ? compareTwoStrings(query_option.value, voice.name) : 0),
                        (voice.name.toLowerCase().startsWith(query_option.value.toLowerCase()) ? 1 : 0)
                    ),
                    voice: voice,
                })
            ).sort(
                (a, b) => b.score - a.score
            ).map(
                (item) => item.voice
            );

            await interaction.respond(
                matching_voices.map(
                    (voice) => ({
                        name: voice.name,
                        value: `${voice.provider}:${voice.code}`,
                    })
                ).slice(0, 25) // 25 is the maximum allowed by discord
            );

            return;
        }

        if (!interaction.isChatInputCommand()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const text = interaction.options.getString('text', true);
        const provider_voice = interaction.options.getString('voice', false) ?? 'google:en-US';

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;

        const bot_member = await interaction.guild.members.fetchMe();

        const bot_voice_channel_id = bot_member.voice.channelId;

        if (!guild_member_voice_channel_id) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });

            return;
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you need to summon me or join my voice channel.`,
                    }),
                ],
            });

            return;
        }

        let music_subscription;
        try {
            music_subscription = await joinVoiceChannelAndEnsureMusicSubscription(
                interaction.guildId,
                bot_voice_channel_id,
                guild_member_voice_channel_id,
                interaction.channelId,
                interaction.guild.voiceAdapterCreator
            );
        } catch {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, I couldn't properly connect to that voice channel.`,
                    }),
                ],
            });

            return;
        }

        const tts_provider = provider_voice.split(':')[0] as 'ibm' | 'google';
        if (
            tts_provider === 'ibm' &&
            text.length > 128
        ) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, sorry but the maximum allowed amount for the IBM voices is set to 128 characters.`,
                    }),
                ],
            });

            return;
        }

        const tts_text_chunks = arrayChunks(
            text.split(/\s/g),
            tts_provider === 'ibm' ? 64 : 16
        ).map((chunk) => chunk.join(' '));

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
                        description: `${interaction.user}, added text-to-speech to the queue:\`\`\`\n${stringEllipses(text, 512)}\n\`\`\``,
                    }),
                ],
            });
        }

        for (let i = 0; i < tts_text_chunks.length; i++) {
            const tts_text = tts_text_chunks[i]!;

            const [ provider, voice ] = provider_voice.split(':') as [ string, string ];

            const track: TrackSpace.TextToSpeechTrack = new TrackSpace.TextToSpeechTrack({
                metadata: {
                    title: `${interaction.user}'s TTS Message`,
                    tts_text: tts_text,
                    tts_provider: provider,
                    tts_voice: voice,
                },
                stream_creator: async () => {
                    let stream: Readable;

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
                                    method: 'post',
                                    url: `${ibm_tts_api_url}/v1/synthesize?voice=${encodeURIComponent(voice)}`,
                                    headers: {
                                        'Accept': 'audio/wav',
                                        'Authorization': `Basic ${Buffer.from(`apikey:${ibm_tts_api_key}`, 'utf8').toString('base64')}`,
                                        'Content-Type': 'application/json',
                                    },
                                    responseType: 'stream',
                                    timeout: 30_000, // 30 seconds
                                    data: {
                                        'text': tts_text,
                                    },
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
                        return;
                    }

                    return stream;
                },
            });

            void track.onStart(async (track) => {
                if (i > 1) {
                    interaction.channel?.send({
                        embeds: [
                            CustomEmbed.from({
                                description: [
                                    `${interaction.user}, playing text-to-speech:`,
                                    `\`\`\`\n${stringEllipses(tts_text, 512)}\n\`\`\``,
                                ].join('\n'),
                            }),
                        ],
                    }).catch(console.warn);
                }
            });

            void track.onFinish(async (track) => {
                if (i === tts_text_chunks.length - 1) {
                    interaction.channel?.send({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, finished playing text-to-speech.`,
                            }),
                        ],
                    }).catch(console.warn);
                }
            });

            void track.onError(async (track, error) => {
                console.trace(error);

                interaction.channel?.send({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Red,
                            description: `${interaction.user}, failed to play text-to-speech.`,
                        }),
                    ],
                }).catch(console.warn);
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

            await delay(5_000); // 5 seconds
        }
    },
});
