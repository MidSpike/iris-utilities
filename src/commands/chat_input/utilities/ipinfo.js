'use strict';

//------------------------------------------------------------//

const axios = require('axios');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../common/app/message');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

const result_key_overrides = {
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

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'ipinfo',
    description: 'displays information about an ip address',
    category: ClientCommand.categories.get('UTILITIES'),
    options: [
        {
            type: 'STRING',
            name: 'query',
            description: 'the ip address to lookup',
            required: true,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        const query = command_interaction.options.get('query').value;

        /* documentation: https://ip-api.com/docs/api:json */
        const { data: response_data } = await axios.get(`http://ip-api.com/json/${query}?fields=66846719`);

        await command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    title: 'IP Info',
                    description: `Here are the results for \`${query}\`!`,
                    fields: Object.entries(response_data).map(([ key, value ]) => ({
                        name: result_key_overrides[key] ?? key,
                        value: `\`${value || 'n/a'}\``,
                        inline: true,
                    })),
                }),
            ],
        }).catch(console.warn);
    },
});
