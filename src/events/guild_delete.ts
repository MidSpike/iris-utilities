//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from 'typings';

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

//------------------------------------------------------------//

const logging_webhook_url = process.env.DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK as string;
if (!logging_webhook_url?.length) throw new TypeError('DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK is not defined');

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

        axios({
            method: 'POST',
            url: logging_webhook_url,
            data: {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
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
                    }),
                ],
            },
            validateStatus: (status_code) => status_code >= 200 && status_code < 300,
        }).catch(error => console.trace('Failed to post to guild retention logging webhook', error));
    },
} as ClientEventExport<typeof event_name>;
