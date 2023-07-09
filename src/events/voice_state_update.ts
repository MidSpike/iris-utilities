//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, GuildConfigLoggingChannels } from '@root/types';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { guildLogger } from '@root/common/app/loggers/loggers';

//------------------------------------------------------------//

const event_name = Discord.Events.VoiceStateUpdate;
export default {
    name: event_name,
    async handler(
        discord_client,
        old_voice_state,
        new_voice_state,
    ) {
        if (!discord_client.isReady()) return; // ignore if not ready

        if (!old_voice_state.member) return; // ignore uncached members
        if (!new_voice_state.member) return; // ignore uncached members

        const user_joined_channel = Boolean(!old_voice_state.channel && new_voice_state.channel);
        const user_left_channel = Boolean(old_voice_state.channel && !new_voice_state.channel);
        const user_moved_channel = Boolean(old_voice_state.channel && new_voice_state.channel && old_voice_state.channel.id !== new_voice_state.channel.id);

        const voice_channel = old_voice_state.channel || new_voice_state.channel;
        if (!voice_channel) return; // ignore when undefined

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        const guild_member = old_voice_state.member || new_voice_state.member;
        if (!guild_member) return; // ignore when undefined

        const user_display_avatar_url = guild_member.user.displayAvatarURL({ forceStatic: false, size: 4096 });

        if (user_joined_channel) {
            guildLogger(
                voice_channel.guild,
                GuildConfigLoggingChannels.MemberConnect,
                {
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Green,
                            description: `${new_voice_state.member} connected to ${new_voice_state.channel}.`,
                            fields: [
                                {
                                    name: 'Member',
                                    value: `${new_voice_state.member}`,
                                    inline: true,
                                }, {
                                    name: 'Channel',
                                    value: `${voice_channel}`,
                                    inline: true,
                                }, {
                                    name: 'Occurred On',
                                    value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                                    inline: false,
                                },
                            ],
                            ...(user_display_avatar_url ? {
                                thumbnail: {
                                    url: user_display_avatar_url,
                                },
                            } : {}),
                        }).toJSON(),
                    ],
                }
            );
        } else if (user_left_channel) {
            guildLogger(
                voice_channel.guild,
                GuildConfigLoggingChannels.MemberDisconnect,
                {
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Red,
                            description: `${old_voice_state.member} disconnected from ${old_voice_state.channel}.`,
                            fields: [
                                {
                                    name: 'Member',
                                    value: `${old_voice_state.member}`,
                                    inline: true,
                                }, {
                                    name: 'Channel',
                                    value: `${voice_channel}`,
                                    inline: true,
                                }, {
                                    name: 'Occurred On',
                                    value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                                    inline: false,
                                },
                            ],
                            ...(user_display_avatar_url ? {
                                thumbnail: {
                                    url: user_display_avatar_url,
                                },
                            } : {}),
                        }).toJSON(),
                    ],
                }
            );
        } else if (user_moved_channel) {
            guildLogger(
                voice_channel.guild,
                GuildConfigLoggingChannels.MemberMove,
                {
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Yellow,
                            description: `${old_voice_state.member} moved from ${old_voice_state.channel} to ${new_voice_state.channel!}.`,
                            fields: [
                                {
                                    name: 'Member',
                                    value: `${old_voice_state.member}`,
                                    inline: true,
                                }, {
                                    name: 'Old Channel',
                                    value: `${old_voice_state.channel}`,
                                    inline: true,
                                }, {
                                    name: 'New Channel',
                                    value: `${new_voice_state.channel}`,
                                    inline: true,
                                }, {
                                    name: 'Occurred On',
                                    value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                                    inline: false,
                                },
                            ],
                            ...(user_display_avatar_url ? {
                                thumbnail: {
                                    url: user_display_avatar_url,
                                },
                            } : {}),
                        }).toJSON(),
                    ],
                }
            );
        }
    },
} as ClientEventExport<typeof event_name>;
