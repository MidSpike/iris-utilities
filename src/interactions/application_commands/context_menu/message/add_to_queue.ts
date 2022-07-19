//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import * as DiscordVoice from '@discordjs/voice';

import { MusicReconnaissance, MusicSubscription, StreamerSpace, TrackSpace, music_subscriptions } from '@root/common/app/music/music';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.MessageApplicationCommandData>({
    identifier: 'Add To Queue',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.Message,
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
    },
    async handler(discord_client, interaction) {
        if (!interaction.isMessageContextMenuCommand()) return;
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply({ ephemeral: false });

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;

        const bot_member = await interaction.guild.members.fetchMe();

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

        const message = interaction.targetMessage;
        if (!message) {
            interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't find the message.`,
                    }),
                ],
            });

            return;
        }

        if (message.author.system || message.author.bot) {
            interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, you can\'t play anything from a message sent by a bot or system account.`,
                    }),
                ],
            });

            return;
        }

        const query = message.cleanContent;

        if (!query.length) {
            interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, you can only use this command on messages that have content.`,
                    }),
                ],
            });

            return;
        }

        let music_subscription = music_subscriptions.get(interaction.guildId);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription({
                voice_connection: DiscordVoice.joinVoiceChannel({
                    channelId: guild_member_voice_channel_id,
                    guildId: interaction.guildId,
                    // @ts-ignore
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                }),
                text_channel: message.channel,
            });
            music_subscriptions.set(interaction.guildId, music_subscription);
        }

        // Make sure the connection is ready before processing the user's request
        try {
            await DiscordVoice.entersState(music_subscription.voice_connection, DiscordVoice.VoiceConnectionStatus.Ready, 10e3);
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

        const search_result = search_results.at(0)!;

        const track: TrackSpace.YouTubeTrack = new TrackSpace.YouTubeTrack({
            metadata: {
                title: search_result.title,
                url: search_result.url,
            },
            stream_creator: () => StreamerSpace.youtubeStream(track.metadata.url),
            events: {
                onStart(track) {
                    interaction.followUp({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                            }),
                        ],
                    }).catch(console.warn);
                },
                onFinish(track) {
                    interaction.followUp({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, finished playing **${track.metadata.title}**.`,
                            }),
                        ],
                    }).catch(console.warn);
                },
                onError(track, error) {
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
            },
        });

        // Add the track and reply a success message to the user
        music_subscription.queue.addTrack(track);

        // Process the music subscription's queue
        await music_subscription.processQueue(false);
    },
});
