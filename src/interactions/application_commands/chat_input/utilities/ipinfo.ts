'use strict';

//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

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

export default new ClientInteraction({
    identifier: 'ipinfo',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'displays information about an ip address',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'the ip address to lookup',
                required: true,
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.BOOLEAN,
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
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

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
