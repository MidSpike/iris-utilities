//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import * as DiscordVoice from '@discordjs/voice';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { MusicSubscription, music_subscriptions } from '@root/common/app/music/music';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'replay',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Boolean,
                name: 'playnext',
                description: 'replay after the current track or at the end of the queue',
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
        command_category: ClientCommandHelper.categories.MUSIC_CONTROLS,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;

        const bot_member = await interaction.guild.members.fetchMe();

        const bot_voice_channel_id = bot_member.voice.channelId;

        if (!bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, I\'m not connected to a voice channel!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        if (guild_member_voice_channel_id !== bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in the same voice channel as me!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        let music_subscription = music_subscriptions.get(interaction.guildId);
        if (!bot_voice_channel_id || !music_subscription) {
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
                        description: `${interaction.user}, I couldn't connect to the voice channel.`,
                    }),
                ],
            });

            return;
        }

        const most_recent_track = music_subscription.queue.previous_tracks.at(0);
        if (!most_recent_track) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'There is nothing to replay!',
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const insert_index = playnext ? 0 : music_subscription.queue.future_tracks.length;
        music_subscription.queue.addTrack(most_recent_track, insert_index);

        // Process the music subscription's queue
        const current_track_exists = Boolean(music_subscription.queue.current_track);
        const force_processing = !current_track_exists; // If there is no current track, then the queue needs to be processed
        await music_subscription.processQueue(force_processing);

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, replaying **${most_recent_track.metadata.title}** ${playnext ? 'next' : 'at the end of the queue'}!`,
                }),
            ],
        }).catch(() => {});
    },
});
