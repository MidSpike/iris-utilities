//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, GuildConfigLoggingChannels } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { guildLogger } from '@root/common/app/loggers/loggers';

import { stringEllipses } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const event_name = Discord.Events.MessageUpdate;
export default {
    name: event_name,
    async handler(
        discord_client,
        old_message,
        new_message,
    ) {
        if (!discord_client.isReady()) return;

        if (old_message.channel.isDMBased()) return; // ignore direct messages
        if (new_message.channel.isDMBased()) return; // ignore direct messages

        if (!old_message.author) return; // ignore messages without an author
        if (!new_message.author) return; // ignore messages without an author

        if (old_message.author.bot) return; // ignore bots
        if (new_message.author.bot) return; // ignore bots

        if (old_message.author.system) return; // Ignore system messages
        if (new_message.author.system) return; // Ignore system messages

        if (old_message.author.id === discord_client.user!.id) return; // ignore messages sent by this bot
        if (new_message.author.id === discord_client.user!.id) return; // ignore messages sent by this bot

        const modified_timestamp = `${new_message.editedTimestamp ?? Date.now()}`.slice(0, -3);

        guildLogger(
            new_message.channel.guild,
            GuildConfigLoggingChannels.MessageModified,
            {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        fields: [
                            {
                                name: 'Snowflake',
                                value: `[${new_message.id}](${new_message.url})`,
                                inline: true,
                            }, {
                                name: 'Channel',
                                value: `${new_message.channel} (${new_message.channel.id})`,
                                inline: true,
                            }, {
                                name: 'Author',
                                value: `${new_message.author} (${new_message.author.id})`,
                                inline: true,
                            }, {
                                name: 'Modified On',
                                value: `<t:${modified_timestamp}:f> (<t:${modified_timestamp}:R>)`,
                                inline: false,
                            },
                            ...(old_message.content && old_message.content !== new_message.content ? [
                                {
                                    name: 'Content (Before)',
                                    value: stringEllipses(Discord.escapeMarkdown(old_message.content), 2000),
                                    inline: false,
                                },
                            ] : []),
                            ...(new_message.content && old_message.content !== new_message.content ? [
                                {
                                    name: 'Content (After)',
                                    value: stringEllipses(Discord.escapeMarkdown(new_message.content), 2000),
                                    inline: false,
                                },
                            ] : []),
                            ...(old_message.attachments.size > 0 && old_message.attachments.size !== new_message.attachments.size ? [
                                {
                                    name: 'Attachments (Before)',
                                    value: old_message.attachments.map((attachment) => `- [${attachment.name}](${attachment.url})`).join('\n'),
                                    inline: false,
                                },
                            ] : []),
                            ...(new_message.attachments.size > 0 && old_message.attachments.size !== new_message.attachments.size ? [
                                {
                                    name: 'Attachments (After)',
                                    value: new_message.attachments.map((attachment) => `- [${attachment.name}](${attachment.url})`).join('\n'),
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
