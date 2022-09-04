//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import * as DiscordVoice from '@discordjs/voice';

import { delay } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { MusicReconnaissance, MusicSubscription, StreamerSpace, TrackSpace, music_subscriptions } from '@root/common/app/music/music';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

async function playQuery(
    interaction: Discord.ChatInputCommandInteraction,
    music_subscription: MusicSubscription,
    query: string,
    playnext: boolean,
) {
    const search_results = await MusicReconnaissance.search(query);

    if (search_results.length === 0) {
        await interaction.editReply({
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
                    description: `${interaction.user}, adding ${search_results.length} track(s) to the queue...`,
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

            const track: TrackSpace.YouTubeTrack = new TrackSpace.YouTubeTrack({
                metadata: {
                    title: track_title,
                    url: track_url,
                },
                stream_creator: () => StreamerSpace.youtubeStream(track.metadata.url),
                events: {
                    onStart(track) {
                        interaction.channel!.send({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onFinish(track) {
                        interaction.channel!.send({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, finished playing **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onError(track, error) {
                        console.trace(error);

                        interaction.channel!.send({
                            embeds: [
                                CustomEmbed.from({
                                    color: CustomEmbed.colors.RED,
                                    description: `${interaction.user}, failed to play **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
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

        await delay(10_000); // insert a delay in-between adding tracks to the queue
    }
}

async function playAttachment(
    interaction: Discord.ChatInputCommandInteraction,
    music_subscription: MusicSubscription,
    attachment: Discord.Attachment,
    playnext: boolean,
) {
    const attachment_name: string = attachment.name || 'Unknown Attachment';
    const attachment_url: string = attachment.url;

    try {
        const track: TrackSpace.RemoteTrack = new TrackSpace.RemoteTrack({
            metadata: {
                title: attachment_name,
                url: attachment_url,
            },
            stream_creator: () => StreamerSpace.remoteStream(attachment_url),
            events: {
                onStart(track) {
                    interaction.channel!.send({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                            }),
                        ],
                    }).catch(console.warn);
                },
                onFinish(track) {
                    interaction.channel!.send({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, finished playing **${track.metadata.title}**.`,
                            }),
                        ],
                    }).catch(console.warn);
                },
                onError(track, error) {
                    console.trace(error);

                    interaction.channel!.send({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.RED,
                                description: `${interaction.user}, failed to play **${track.metadata.title}**.`,
                            }),
                        ],
                    }).catch(console.warn);
                },
            },
        });

        // Add the track and reply a success message to the user
        const insert_index = playnext ? 0 : music_subscription.queue.future_tracks.length;
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
                    description: `${interaction.user}, failed to add **${attachment.name}** to the queue.`,
                }),
            ],
        });
    }
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'play',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'allows for playing audio resources',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'music',
                description: 'searches for music, then plays it',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'query',
                        description: 'the query to search for',
                        required: true,
                    }, {
                        type: Discord.ApplicationCommandOptionType.Boolean,
                        name: 'playnext',
                        description: 'whether to play next',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'file',
                description: 'plays a file',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.Attachment,
                        name: 'attachment',
                        description: 'the attachment to play',
                        required: true,
                    }, {
                        type: Discord.ApplicationCommandOptionType.Boolean,
                        name: 'playnext',
                        description: 'whether to play next',
                        required: false,
                    },
                ],
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
        command_category: ClientCommandHelper.categories.MUSIC_CONTROLS,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;

        const bot_member = await interaction.guild.members.fetchMe();

        const bot_voice_channel_id = bot_member.voice.channelId;

        if (!guild_member_voice_channel_id) {
            interaction.editReply({
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

        let music_subscription = music_subscriptions.get(interaction.guildId);
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription({
                voice_connection: DiscordVoice.joinVoiceChannel({
                    channelId: guild_member_voice_channel_id,
                    guildId: interaction.guildId,
                    // @ts-ignore
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                }),
                text_channel: interaction.channel,
            });
            music_subscriptions.set(interaction.guildId, music_subscription);
        }

        try {
            await DiscordVoice.entersState(music_subscription.voice_connection, DiscordVoice.VoiceConnectionStatus.Ready, 10e3);
        } catch (error) {
            console.warn(error);

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't properly connect to that voice channel.`,
                    }),
                ],
            });

            return;
        }

        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        const sub_command_name = interaction.options.getSubcommand();
        switch (sub_command_name) {
            case 'music': {
                const query = interaction.options.getString('query', true);

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                `${interaction.user}, searching for:`,
                                '\`\`\`',
                                `${query}`,
                                '\`\`\`',
                            ].join('\n'),
                        }),
                    ],
                });

                await playQuery(interaction, music_subscription, query, playnext);

                break;
            }

            case 'file': {
                const attachment = interaction.options.getAttachment('attachment', true);

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                `${interaction.user}, buffering uploaded attachment...`,
                            ].join('\n'),
                        }),
                    ],
                });

                await playAttachment(interaction, music_subscription, attachment, playnext);

                break;
            }

            default: {
                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Error - Unknown Subcommand',
                            description: `${interaction.user}, something went wrong.`,
                        }),
                    ],
                });

                break;
            }
        }
    },
});
