'use strict';

//#region dependencies
const axios = require('axios');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

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

module.exports = new DisBotCommand({
    name: 'IPINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 8,
    description: 'IP Information',
    aliases: ['ipinfo'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const search_query = command_args[0]?.trim() ?? '';

        if (search_query.length === 0) {
            message.channel.send(new CustomRichEmbed({
                title: 'You aren\'t trying to spy on people now, are you?',
                description: 'With great power, comes great responsibility. Stay legal my friend!',
                thumbnail: `${bot_cdn_url}/encryption-lock-info.jpg`,
                fields: [
                    {
                        name: 'Command Usage',
                        value: `${'```'}\n${discord_command} IP_ADDRESS_HERE\n${'```'}`,
                    }, {
                        name: 'Example Usage',
                        value: `${'```'}\n${discord_command} 1.1.1.1\n${'```'}`,
                    },
                ],
            }, message));
            return;
        }

        /* documentation: https://ip-api.com/docs/api:json */
        const { data: response_data } = await axios.get(`http://ip-api.com/json/${search_query}?fields=66846719`);

        await message.channel.send(new CustomRichEmbed({
            title: 'IP Info',
            description: `Here are the results for \`${search_query}\`!`,
            fields: Object.entries(response_data).map(([ key, value ]) => ({
                name: result_key_overrides[key] ?? key,
                value: `\`${value || 'n/a'}\``,
                inline: true,
            })),
        }, message)).catch(console.warn);
    },
});
