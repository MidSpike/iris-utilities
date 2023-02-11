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
    identifier: 'summon',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [],
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

        const guild_member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = guild_member.voice.channelId;
        if (!guild_member_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });

            return;
        }

        const bot_member = await interaction.guild.members.fetchMe();
        const bot_voice_channel_id = bot_member.voice.channelId;

        if (
            bot_voice_channel_id && // check if the bot is in a voice channel
            bot_voice_channel_id !== guild_member_voice_channel_id // check if the bot is not in the same voice channel as the user
        ) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: [
                            `${interaction.user}, I'm currently in a different voice channel.`,
                            'That means that I might be playing audio for someone else.',
                            '',
                            'Do you want to summon me to your voice channel?',
                        ].join('\n'),
                    }),
                ],
                components: [
                    new Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>().setComponents([
                        new Discord.ButtonBuilder()
                            .setCustomId('chat_input_command:summon:confirm')
                            .setStyle(Discord.ButtonStyle.Danger)
                            .setLabel('Yes'),
                        new Discord.ButtonBuilder()
                            .setCustomId('chat_input_command:summon:cancel')
                            .setStyle(Discord.ButtonStyle.Secondary)
                            .setLabel('No'),
                    ]),
                ],
            });

            const confirm_summon_interaction = await interaction.channel.awaitMessageComponent({
                componentType: Discord.ComponentType.Button,
                filter: (button_interaction) => button_interaction.user.id === interaction.user.id,
            });

            await confirm_summon_interaction.deferReply();

            if (confirm_summon_interaction.customId === 'chat_input_command:summon:cancel') return; // halt execution
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
                        description: `${interaction.user}, I couldn't properly connect to that voice channel.`,
                    }),
                ],
            });

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, summoned me to <#${guild_member_voice_channel_id}>!`,
                }),
            ],
        });
    },
});
