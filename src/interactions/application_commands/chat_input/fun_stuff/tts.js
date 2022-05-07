'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const {
    createAudioResource,
    demuxProbe,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
} = require('@discordjs/voice');

const { GoogleTranslateTTS } = require('google-translate-tts');

const { delay, string_ellipses, array_chunks } = require('../../../../common/lib/utilities');

const { CustomEmbed } = require('../../../../common/app/message');
const { BaseTrack, MusicSubscription, music_subscriptions } = require('../../../../common/app/music/music');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
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

        await interaction.deferReply({ ephemeral: false });

        const text = interaction.options.getString('text', true);

        const guild_member_voice_channel_id = interaction.member.voice.channelId;
        const bot_voice_channel_id = interaction.guild.me.voice.channelId;

        if (!guild_member_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            return interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to summon me or join my voice channel.`,
                    }),
                ],
            });
        }

        /** @type {MusicSubscription} */
        let music_subscription = music_subscriptions.get(interaction.guildId);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription(
                joinVoiceChannel({
                    channelId: guild_member_voice_channel_id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                })
            );
            music_subscription.voiceConnection.on('error', console.warn);
            music_subscriptions.set(interaction.guildId, music_subscription);
        }

        // Make sure the connection is ready before processing the user's request
        try {
            await entersState(music_subscription.voiceConnection, VoiceConnectionStatus.Ready, 10e3);
        } catch (error) {
            console.warn(error);
            return await interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't connect to the voice channel.`,
                    }),
                ],
            });
        }

        const tts_text_chunks = array_chunks(text.split(/\s/g), 25).map(chunk => chunk.join(' '));

        if (tts_text_chunks.length > 1) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, added ${tts_text_chunks.length} tts chunks to the queue.`,
                    }),
                ],
            });
        } else {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, added text-to-speech to the queue:\`\`\`\n${string_ellipses(text, 512)}\n\`\`\``,
                    }),
                ],
            });
        }

        for (let i = 0; i < tts_text_chunks.length; i++) {
            const tts_text = tts_text_chunks[i];

            const track = new BaseTrack({
                title: `${interaction.user}'s TTS Message`,
                tts_text: tts_text,
            }, async (track) => await new Promise(async (resolve, reject) => {
                const gt_tts = new GoogleTranslateTTS({
                    language: 'en-us',
                    text: track.metadata.tts_text,
                });

                const stream = await gt_tts.stream();
                if (!stream) {
                    reject(new Error('No stdout'));
                    return;
                }

                const onError = (error) => {
                    console.trace(error);

                    if (!process.killed) process.kill();
                    stream.resume();
                    reject(error);

                    return;
                };

                demuxProbe(stream).then((probe) => {
                    resolve(createAudioResource(probe.stream, {
                        inputType: probe.type,
                        inlineVolume: true, // allows volume to be adjusted while playing
                        metadata: track, // the track
                    }))
                }).catch(onError);
            }), {
                onStart() {
                    // IMPORTANT: Initialize the volume interface
                    music_subscription.queue.volume_manager.initialize();

                    if (i > 1) {
                        interaction.channel.send({
                            embeds: [
                                new CustomEmbed({
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
                        interaction.channel.send({
                            embeds: [
                                new CustomEmbed({
                                    description: `${interaction.user}, finished playing text-to-speech.`,
                                }),
                            ],
                        }).catch(console.warn);
                    }
                },
                onError(error) {
                    console.trace(error);

                    interaction.channel.send({
                        embeds: [
                            new CustomEmbed({
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
                    new CustomEmbed({
                        description: `Added text to speech to the queue.`,
                    }),
                ],
            });

            await delay(5_000);
        }
    },
});
