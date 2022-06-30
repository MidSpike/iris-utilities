//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { sendWebhookMessage } from '@root/common/app/webhook';

//------------------------------------------------------------//

const logging_webhook_url = process.env.DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK as string;
if (!logging_webhook_url?.length) throw new TypeError('DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK is not defined');

//------------------------------------------------------------//

const event_name = Discord.Events.GuildCreate;
export default {
    name: event_name,
    async handler(
        discord_client,
        guild,
    ) {
        if (!discord_client.isReady()) return;

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        const guild_icon_url = guild.iconURL({ forceStatic: false, size: 4096 });

        sendWebhookMessage(logging_webhook_url, {
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.GREEN,
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
                            name: 'Added On',
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
    },
} as ClientEventExport<typeof event_name>;
