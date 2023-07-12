//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from '@root/types';

import * as Discord from 'discord.js';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { sendWebhookMessage } from '@root/common/app/webhook';

//------------------------------------------------------------//

const logging_webhook_url = parseEnvironmentVariable(EnvironmentVariableName.DiscordBotCentralLoggingGuildRetentionWebhook, 'string');

//------------------------------------------------------------//

const event_name = Discord.Events.GuildDelete;
export default {
    name: event_name,
    async handler(
        discord_client,
        guild,
    ) {
        if (!discord_client.isReady()) return;

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        const guild_icon_url = guild.iconURL({ forceStatic: false, size: 4096 });

        try {
            await sendWebhookMessage(logging_webhook_url, {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        fields: [
                            {
                                name: 'Guild',
                                value: `\`${guild.name}\``,
                                inline: true,
                            }, {
                                name: 'Snowflake',
                                value: `\`${guild.id}\``,
                                inline: true,
                            }, {
                                name: 'Removed On',
                                value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                            },
                        ],
                        ...(guild_icon_url ? {
                            thumbnail: {
                                url: guild_icon_url,
                            },
                        } : {}),
                    }).toJSON(),
                ],
            });
        } catch (error) {
            console.trace(error);
        }
    },
} as ClientEventExport<typeof event_name>;
