'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { joinVoiceChannel } from '@discordjs/voice';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

import { MusicSubscription, music_subscriptions } from '../../../../common/app/music/music';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'summon',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [],
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
        command_category: ClientCommandHelper.categories.get('MUSIC_CONTROLS'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply({ ephemeral: false });

        const guild_member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = guild_member.voice.channelId;

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

        let music_subscription = music_subscriptions.get(interaction.guildId);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.

        const voice_connection = joinVoiceChannel({
            channelId: guild_member_voice_channel_id,
            guildId: interaction.guildId,
            // @ts-ignore This works, even though it's not a valid type.
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        if (!music_subscription) {
            music_subscription = new MusicSubscription(voice_connection);
            music_subscriptions.set(interaction.guildId, music_subscription);
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
