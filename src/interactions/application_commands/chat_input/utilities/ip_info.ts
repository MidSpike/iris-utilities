//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const ip_api_com_response_key_overrides: { [key: string]: string; } = {
    'continent': 'continent name',
    'continentCode': 'continent code',
    'country': 'country name',
    'countryCode': 'country code',
    'region': 'region code',
    'regionName': 'region name',
    'city': 'city name',
    'district': 'district name',
    'zip': 'postal code',
    'lat': 'latitude',
    'lon': 'longitude',
    'offset': 'utc offset',
    'currency': 'currency code',
    'isp': 'internet service provider',
    'org': 'organization',
    'as': 'autonomous system number',
    'asname': 'autonomous system name',
    'reverse': 'reverse dns',
    'mobile': 'cellular connection',
    'proxy': 'proxy/vpn/tor',
    'hosting': 'data center',
};

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'ip_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays information about an ip address',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'query',
                description: 'the ip address to lookup',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.Boolean,
                name: 'ephemeral',
                description: 'send the response as an ephemeral message',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.UTILITIES,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        const ephemeral = interaction.options.getBoolean('ephemeral', false) ?? false;

        await interaction.deferReply({ ephemeral: ephemeral });

        const query = interaction.options.getString('query', true);

        /* documentation: https://ip-api.com/docs/api:json */
        const { data: response_data }: {
            [key: string]: string;
        } = await axios.get(`http://ip-api.com/json/${query}?fields=66846719`);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'IP Info',
                    description: `Here are the results for \`${query}\`!`,
                    fields: Object.entries(response_data).map(([ key, value ]) => ({
                        name: ip_api_com_response_key_overrides[key] ?? key,
                        value: `\`${value || 'n/a'}\``,
                        inline: true,
                    })),
                }),
            ],
        }).catch(console.warn);
    },
});
