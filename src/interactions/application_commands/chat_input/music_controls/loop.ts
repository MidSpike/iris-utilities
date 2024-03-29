//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { QueueSpace, music_subscriptions } from '@root/common/app/music/music';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'loop',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'type',
                description: 'the type of looping method',
                choices: [
                    {
                        name: 'off',
                        value: 'off',
                    }, {
                        name: 'current track',
                        value: 'track',
                    }, {
                        name: 'all tracks',
                        value: 'queue',
                    }, {
                        name: 'autoplay',
                        value: 'autoplay',
                    },
                ],
                required: true,
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
        if (!music_subscription) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        title: 'Nothing is playing right now!',
                    }),
                ],
            }).catch(() => {});
            return;
        }

        const looping_mode_option = interaction.options.get('type', true);

        try {
            music_subscription.queue.looping_mode = looping_mode_option.value as QueueSpace.QueueLoopingMode;
        } catch (error) {
            console.trace(error, { looping_mode_option });

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, an error occurred while trying to set the looping mode!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const command_looping_mode_option = this.data!.options!.find(
            (option) => option.name === looping_mode_option.name
        )! as Discord.ApplicationCommandChoicesData;

        const command_looping_mode_choices = command_looping_mode_option!.choices!;

        const command_looping_mode_choice = command_looping_mode_choices.find(
            (choice) => choice.value === looping_mode_option.value
        )!;

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, set queue looping to **${command_looping_mode_choice.name}**.`,
                }),
            ],
        }).catch(() => {});
    },
});
