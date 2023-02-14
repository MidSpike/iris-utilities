//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, GuildConfigLoggingChannels } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { guildLogger } from '@root/common/app/loggers/loggers';

//------------------------------------------------------------//

const event_name = Discord.Events.MessageBulkDelete;
export default {
    name: event_name,
    async handler(
        discord_client,
        messages,
        channel,
    ) {
        if (!discord_client.isReady()) return;

        if (channel.isDMBased()) return; // ignore direct messages
        if (!channel.guild) return; // ignore direct messages

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        guildLogger(
            channel.guild,
            GuildConfigLoggingChannels.MessageDeleted,
            {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${messages.size} messages were deleted in ${channel}.`,
                        fields: [
                            {
                                name: 'Deleted On',
                                value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                            },
                        ],
                    }).toJSON(),
                ],
            }
        );
    },
} as ClientEventExport<typeof event_name>;
