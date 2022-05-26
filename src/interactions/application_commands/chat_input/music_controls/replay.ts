'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { VoiceConnectionStatus, entersState, joinVoiceChannel } from '@discordjs/voice';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

import { music_subscriptions } from '../../../../common/app/music/music';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'replay',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.BOOLEAN,
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

        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channel?.id;
        const bot_voice_channel_id = interaction.guild.me!.voice.channel?.id;

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

        const music_subscription = music_subscriptions.get(interaction.guildId);
        if (!music_subscription) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Nothing is playing right now!',
                    }),
                ],
            }).catch(() => {});

            return;
        }

        joinVoiceChannel({
            channelId: guild_member_voice_channel_id,
            guildId: interaction.guildId,
            // @ts-ignore This works, even though it's not a valid type.
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        try {
            await entersState(music_subscription.voice_connection, VoiceConnectionStatus.Ready, 10e3); // 10 seconds
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
        await music_subscription.processQueue(false);

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, replaying **${most_recent_track.metadata.title}** ${playnext ? 'next' : 'at the end of the queue'}!`,
                }),
            ],
        }).catch(() => {});
    },
});
