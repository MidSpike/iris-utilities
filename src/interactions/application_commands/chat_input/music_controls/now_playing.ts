//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { music_subscriptions } from '@root/common/app/music/music';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'now_playing',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays the currently playing track',
        options: [],
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
        command_category: ClientCommandHelper.categories.MUSIC_CONTROLS,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channel?.id;

        const bot_member = await interaction.guild.members.fetchMe();

        const bot_voice_channel_id = bot_member.voice.channel?.id;

        if (!bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
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
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you need to be in the same voice channel as me!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const music_subscription = music_subscriptions.get(interaction.guildId);

        const current_track = music_subscription?.queue?.current_track;

        if (!current_track) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        title: `${interaction.user}, nothing is playing right now!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, **${current_track.metadata.title}** is currently playing!`,
                }),
            ],
        }).catch(() => {});
    },
});
