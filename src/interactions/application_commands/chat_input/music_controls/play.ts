//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { VoiceConnectionStatus, createAudioResource, demuxProbe, entersState, joinVoiceChannel } from '@discordjs/voice';

import { delay } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { MusicReconnaissance, MusicSubscription, RemoteTrack, Streamer, music_subscriptions } from '@root/common/app/music/music';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'play',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'allows for playing audio resources',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'query',
                description: 'the query to search',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.Boolean,
                name: 'playnext',
                description: 'whether to play next',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.get('MUSIC_CONTROLS'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const query = interaction.options.getString('query', true);
        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;

        const bot_member = await interaction.guild.members.fetch(discord_client.user.id);

        const bot_voice_channel_id = bot_member.voice.channelId;

        if (!guild_member_voice_channel_id) {
            interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });

            return;
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to summon me or join my voice channel.`,
                    }),
                ],
            });

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, searching for:\`\`\`\n${query}\n\`\`\``,
                }),
            ],
        });

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

        const search_results = await MusicReconnaissance.search(query);

        if (search_results.length === 0) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, I couldn't find anything for **${query}**.`,
                    }),
                ],
            });

            return;
        }

        if (search_results.length > 1) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, added ${search_results.length} track(s) to the queue...`,
                    }),
                ],
            });
        }

        for (let i = 0; i < search_results.length; i++) {
            const insert_index = playnext ? i : music_subscription.queue.future_tracks.length;

            const search_result = search_results[i];

            try {
                const track_title = search_result.title;
                const track_url = search_result.url;

                const track = new RemoteTrack({
                    title: track_title,
                    url: track_url,
                }, () => new Promise(async (resolve, reject) => {
                    const stream = await Streamer.youtubeStream(track.metadata.url);

                    if (!stream) {
                        reject(new Error('No stdout'));
                        return;
                    }

                    demuxProbe(stream).then((probe) => {
                        resolve(createAudioResource(probe.stream, {
                            inputType: probe.type,
                            inlineVolume: true, // allows volume to be adjusted while playing
                            metadata: track, // the track
                        }));
                    }).catch((error: unknown) => {
                        console.trace(error);

                        reject(error);
                    });
                }), {
                    onStart() {
                        // IMPORTANT: Initialize the volume interface
                        music_subscription!.queue.volume_manager.initialize();

                        interaction.followUp({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onFinish() {
                        interaction.followUp({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, finished playing **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onError(error) {
                        console.trace(error);

                        interaction.followUp({
                            embeds: [
                                CustomEmbed.from({
                                    color: CustomEmbed.colors.RED,
                                    description: `${interaction.user}, failed to play **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                });

                // Add the track and reply a success message to the user
                music_subscription.queue.addTrack(track, insert_index);

                // Process the music subscription's queue
                await music_subscription.processQueue(false);

                await interaction.followUp({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, added **[${track.metadata.title}](${track.metadata.url})** to the queue.`,
                        }),
                    ],
                });
            } catch (error) {
                console.warn(error);
                await interaction.followUp({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.colors.RED,
                            description: `${interaction.user}, failed to add **${search_result.title}** to the queue.`,
                        }),
                    ],
                });
            }

            await delay(5_000);
        }
    },
});
