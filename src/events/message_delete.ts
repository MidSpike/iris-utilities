//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, GuildConfigLoggingChannels } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { guildLogger } from '@root/common/app/loggers/loggers';

import { stringEllipses } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const event_name = Discord.Events.MessageDelete;
export default {
    name: event_name,
    async handler(
        discord_client,
        message,
    ) {
        if (!discord_client.isReady()) return;

        if (message.channel.isDMBased()) return; // ignore direct messages

        if (!message.author) return; // ignore messages without an author

        if (message.author.bot) return; // ignore bots
        if (message.author.system) return; // Ignore system messages
        if (message.author.id === discord_client.user.id) return; // ignore messages sent by this bot

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        guildLogger(
            message.channel.guild,
            GuildConfigLoggingChannels.MessageDeleted,
            {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        fields: [
                            {
                                name: 'Snowflake',
                                value: `[${message.id}](${message.url})`,
                                inline: true,
                            }, {
                                name: 'Channel',
                                value: `${message.channel} (${message.channel.id})`,
                                inline: true,
                            }, {
                                name: 'Author',
                                value: `${message.author} (${message.author.id})`,
                                inline: true,
                            }, {
                                name: 'Deleted On',
                                value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                                inline: false,
                            },
                            ...(message.content ? [
                                {
                                    name: 'Content',
                                    value: stringEllipses(Discord.escapeMarkdown(message.content), 2000),
                                    inline: false,
                                },
                            ] : []),
                            ...(message.attachments.size > 0 ? [
                                {
                                    name: 'Attachments',
                                    value: message.attachments.map((attachment) => `- [${attachment.name}](${attachment.url})`).join('\n'),
                                    inline: false,
                                },
                            ] : []),
                        ],
                    }).toJSON(),
                ],
            }
        );
    },
} as ClientEventExport<typeof event_name>;
