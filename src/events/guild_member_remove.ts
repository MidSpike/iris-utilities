//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, GuildConfigLoggingChannels } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { guildLogger } from '@root/common/app/loggers/loggers';

//------------------------------------------------------------//

const event_name = Discord.Events.GuildMemberRemove;
export default {
    name: event_name,
    async handler(
        discord_client,
        guild_member,
    ) {
        if (!discord_client.isReady()) return;

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        const user_display_avatar_url = guild_member.user.displayAvatarURL({ forceStatic: false, size: 4096 });

        guildLogger(
            guild_member.guild,
            GuildConfigLoggingChannels.MEMBER_LEAVE,
            {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        fields: [
                            {
                                name: 'Member',
                                value: `\`${guild_member.user.tag}\``,
                                inline: true,
                            }, {
                                name: 'Snowflake',
                                value: `\`${guild_member.user.id}\``,
                                inline: true,
                            }, {
                                name: 'Left On',
                                value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
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
    },
} as ClientEventExport<typeof event_name>;