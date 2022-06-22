//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

type WeatherLocationInfo = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    timezone: string;
    admin1: string;
    admin2: string;
    admin3: string;
    admin4: string;
};

type WeatherInfo = {
    generationtime_ms: number;
    elevation: number;
    longitude: number;
    latitude: number;
    utc_offset_seconds: number;
    current_weather: {
        weathercode: number;
        temperature: number;
        time: number;
        windspeed: number;
        winddirection: number;
    };
    hourly_units: {
        soil_temperature_54cm: string;
        soil_temperature_6cm: string;
        windgusts_10m: string;
        et0_fao_evapotranspiration: string;
        showers: string;
        precipitation: string;
        surface_pressure: string;
        temperature_2m: string;
        winddirection_180m: string;
        freezinglevel_height: string;
        shortwave_radiation: string;
        winddirection_10m: string;
        diffuse_radiation: string;
        windspeed_10m: string;
        cloudcover_mid: string;
        winddirection_80m: string;
        cloudcover_low: string;
        relativehumidity_2m: string;
        winddirection_120m: string;
        soil_temperature_0cm: string;
        soil_temperature_18cm: string;
        soil_moisture_1_3cm: string;
        windspeed_80m: string;
        time: string;
        apparent_temperature: string;
        soil_moisture_27_81cm: string;
        snow_depth: string;
        vapor_pressure_deficit: string;
        rain: string;
        cloudcover: string;
        weathercode: string;
        windspeed_180m: string;
        soil_moisture_0_1cm: string;
        direct_radiation: string;
        dewpoint_2m: string;
        soil_moisture_3_9cm: string;
        cloudcover_high: string;
        soil_moisture_9_27cm: string;
        windspeed_120m: string;
        snowfall: string;
        pressure_msl: string;
        direct_normal_irradiance: string;
        evapotranspiration: string;
    },
    hourly: {
        soil_moisture_9_27cm: number[];
        windspeed_180m: number[];
        cloudcover_low: number[];
        soil_moisture_0_1cm: number[];
        vapor_pressure_deficit: number[];
        soil_temperature_54cm: number[];
        weathercode: number[];
        precipitation: number[];
        soil_temperature_0cm: number[];
        direct_normal_irradiance: number[];
        windgusts_10m: number[];
        soil_moisture_1_3cm: number[];
        soil_moisture_3_9cm: number[];
        winddirection_80m: number[];
        time: number[];
        direct_radiation: number[];
        apparent_temperature: number[];
        winddirection_10m: number[];
        dewpoint_2m: number[];
        snowfall: number[];
        snow_depth: number[];
        surface_pressure: number[];
        temperature_2m: number[];
        soil_temperature_6cm: number[];
        showers: number[];
        soil_moisture_27_81cm: number[];
        rain: number[];
        winddirection_120m: number[];
        et0_fao_evapotranspiration: number[];
        winddirection_180m: number[];
        relativehumidity_2m: number[];
        cloudcover_high: number[];
        freezinglevel_height: number[];
        diffuse_radiation: number[];
        windspeed_80m: number[];
        soil_temperature_18cm: number[];
        cloudcover: number[];
        evapotranspiration: number[];
        shortwave_radiation: number[];
        windspeed_120m: number[];
        cloudcover_mid: number[];
        pressure_msl: number[];
        windspeed_10m: number[];
    };
    daily_units: {
        precipitation_sum: string;
        snowfall_sum: string;
        sunrise: string;
        apparent_temperature_max: string;
        precipitation_hours: string;
        temperature_2m_min: string;
        temperature_2m_max: string;
        rain_sum: string;
        et0_fao_evapotranspiration: string;
        sunset: string;
        windgusts_10m_max: string;
        showers_sum: string;
        time: string;
        apparent_temperature_min: string;
        weathercode: string;
        windspeed_10m_max: string;
        winddirection_10m_dominant: string;
        shortwave_radiation_sum: string;
    },
    daily: {
        winddirection_10m_dominant: number[];
        showers_sum: number[];
        shortwave_radiation_sum: number[];
        snowfall_sum: number[];
        windspeed_10m_max: number[];
        precipitation_hours: number[];
        apparent_temperature_min: number[];
        temperature_2m_max: number[];
        weathercode: number[];
        sunset: number[];
        apparent_temperature_max: number[];
        time: number[];
        sunrise: number[];
        windgusts_10m_max: number[];
        temperature_2m_min: number[];
        rain_sum: number[];
        precipitation_sum: number[];
        et0_fao_evapotranspiration: number[];
    };
};

//------------------------------------------------------------//

/* WMO Weather interpretation codes (WW) */
const weather_codes_mapping: [ [ number, number ], string ][] = [
    [ [ 0, 0 ], 'Clear skies' ],
    [ [ 1, 3 ], 'Cloudy' ],
    [ [ 4, 4 ], 'Smoke' ],
    [ [ 5, 5 ], 'Smoke' ],
    [ [ 6, 8 ], 'Dust' ],
    [ [ 9, 9 ], 'Dust storm' ],
    [ [ 10, 10 ], 'Mist' ],
    [ [ 11, 12 ], 'Fog' ],
    [ [ 13, 13 ], 'Lightning' ],
    [ [ 14, 16 ], 'Precipitation' ],
    [ [ 17, 17 ], 'Thunder' ],
    [ [ 18, 19 ], 'Funnel clouds' ],
    [ [ 20, 24 ], 'Rain or snow' ],
    [ [ 25, 25 ], 'Rain showers' ],
    [ [ 26, 26 ], 'Mixed showers' ],
    [ [ 27, 27 ], 'Hail Showers' ],
    [ [ 28, 28 ], 'Fog' ],
    [ [ 29, 29 ], 'Thunderstorms' ],
    [ [ 30, 35 ], 'Dust storm' ],
    [ [ 36, 39 ], 'Snow' ],
    [ [ 40, 49 ], 'Fog' ],
    [ [ 50, 59 ], 'Drizzle' ],
    [ [ 60, 69 ], 'Rain' ],
    [ [ 70, 79 ], 'Snow' ],
    [ [ 80, 99 ], 'Showers' ],
];

//------------------------------------------------------------//

const command_autocomplete_cache = new Map<WeatherLocationInfo['name'], WeatherLocationInfo>();

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'weather_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'gets weather information for a city',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'location',
                description: 'the location to get weather information for',
                autocomplete: true,
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'units',
                description: 'the units to use for the results',
                required: false,
                choices: [
                    {
                        name: 'Metric',
                        value: 'metric',
                    }, {
                        name: 'Imperial',
                        value: 'imperial',
                    },
                ],
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
        if (!interaction.inCachedGuild()) return;

        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const query_option = interaction.options.getFocused(true);

            if (query_option.name !== 'location') return;

            if (query_option.value.length < 1) {
                interaction.respond([]);

                return;
            }

            /* https://open-meteo.com/en/docs/geocoding-api */
            const matching_locations = await axios({
                method: 'get',
                url: `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({
                    'language': 'en',
                    'count': '10',
                    'format': 'json',
                    'name': query_option.value,
                })}`,
                validateStatus: (status_code) => status_code === 200,
            }).then(response => response.data.results) as WeatherLocationInfo[] ?? [];

            if (matching_locations.length < 1) {
                interaction.respond([]);

                return;
            }

            for (const matching_location of matching_locations) {
                command_autocomplete_cache.set(`${matching_location.id}`, matching_location);
            }

            interaction.respond(
                matching_locations.map((matching_location) => {
                    const location_string = [ matching_location.admin1, matching_location.admin2, matching_location.admin3, matching_location.admin4 ].filter(item => Boolean(item)).join(', ');

                    return {
                        name: `${matching_location.name} - ${matching_location.country}, ${location_string}`,
                        value: `${matching_location.id}`,
                    };
                }).slice(0, 10) // default is 10 results
            );

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const ephemeral = interaction.options.getBoolean('ephemeral', false) ?? false;

        await interaction.deferReply({ ephemeral: ephemeral });

        const location_option_value = interaction.options.getString('location', true);
        const units_option_value = interaction.options.getString('units', false) ?? 'metric';

        const matching_location = command_autocomplete_cache.get(location_option_value);

        if (!matching_location) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        title: 'Failed to find location',
                        description: `Could not find a location matching \"${location_option_value}\"`,
                    }),
                ],
            });

            return;
        }

        /* documentation: https://open-meteo.com/en/docs */
        const weather_info = await axios({
            method: 'get',
            url: `https://api.open-meteo.com/v1/forecast?${
                new URLSearchParams([
                    [ 'latitude', `${matching_location.latitude}` ],
                    [ 'longitude', `${matching_location.longitude}` ],
                    [ 'timezone', `${matching_location.timezone}` ],
                    [ 'past_days', '0' ],
                    [ 'timeformat', 'unixtime' ],
                    [ 'current_weather', 'true' ],
                    [ 'temperature_unit', units_option_value === 'metric' ? 'celsius' : 'fahrenheit' ],
                    [ 'windspeed_unit', units_option_value === 'metric' ? 'kmh' : 'mph' ],
                    [ 'precipitation_unit', units_option_value === 'metric' ? 'mm' : 'inch' ],
                    ...(
                        'temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,pressure_msl,surface_pressure,precipitation,rain,showers,snowfall,weathercode,snow_depth,freezinglevel_height,cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,evapotranspiration,et0_fao_evapotranspiration,vapor_pressure_deficit,windspeed_10m,windspeed_80m,windspeed_120m,windspeed_180m,winddirection_10m,winddirection_80m,winddirection_120m,winddirection_180m,windgusts_10m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,soil_moisture_9_27cm,soil_moisture_27_81cm'
                    ).split(',').map((key) => [ 'hourly', key ]),
                    ...(
                        'weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration'
                    ).split(',').map((key) => [ 'daily', key ]),
                ])
            }`,
            validateStatus: (status_code) => status_code === 200,
        }).then(response => response.data) as WeatherInfo;

        const weather_status: string = weather_codes_mapping.find(
            ([ code_range ]) => weather_info.current_weather.weathercode >= code_range[0] && weather_info.current_weather.weathercode <= code_range[1]
        )?.[1] ?? 'Unknown';

        const location_string = [ matching_location.admin1, matching_location.admin2, matching_location.admin3, matching_location.admin4 ].filter(item => Boolean(item)).join(', ');

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Weather Forecast',
                    description: [
                        'Here is the current forecast for:',
                        `**${matching_location.name} - ${location_string}**`,
                    ].join('\n'),
                    fields: [
                        {
                            name: 'Last Updated',
                            value: `<t:${weather_info.current_weather.time}:f> (<t:${weather_info.current_weather.time}:R>)`,
                        }, {
                            name: 'Weather',
                            value: `${weather_status}`,
                            inline: true,
                        }, {
                            name: 'Temperature',
                            value: `${weather_info.current_weather.temperature}${units_option_value === 'metric' ? '\u00B0C' : '\u00B0F'}`,
                            inline: true,
                        }, {
                            name: 'Wind',
                            value: `${weather_info.current_weather.winddirection}\u00B0 @ ${weather_info.current_weather.windspeed} ${units_option_value === 'metric' ? 'km/h' : 'mph'}`,
                            inline: true,
                        },
                    ],
                }),
            ],
        }).catch(console.warn);
    },
});
