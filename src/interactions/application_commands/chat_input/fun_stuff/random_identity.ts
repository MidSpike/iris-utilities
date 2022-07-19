//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

type RandomIdentityApiResponseData = {
    results: {
        gender: string;
        name: {
            title: string;
            first: string;
            last: string;
        };
        location: {
            street: {
                number: number;
                name: string;
            },
            city: string;
            state: string;
            country: string;
            postcode: number;
            coordinates: {
                latitude: string;
                longitude: string;
            };
            timezone: {
                offset: string; // "-9:00"
                description: string; // "Alaska"
            };
        };
        email: string;
        login: {
            uuid: string;
            username: string;
            password: string;
            salt: string;
            md5: string;
            sha1: string;
            sha256: string;
        };
        dob: {
            date: string; // ISO 8601 Timestamp
            age: number;
        };
        registered: {
            date: string; // ISO 8601 Timestamp
            age: number;
        };
        phone: string;
        cell: string;
        id?: {
            name?: string;
            value?: string;
        };
        picture: {
            large: string;
            medium: string;
            thumbnail: string;
        };
        nat: string; // "NO"
    }[];
    info: {
        seed: string;
        results: number;
        page: number;
        version: string;
    };
};

//------------------------------------------------------------//

function isoTimestampToDiscordTimestamp(
    iso_timestamp: string
): string {
    const epoch_ms = new Date(iso_timestamp).getTime();

    return `${epoch_ms}`.slice(0, -3);
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'random_identity',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'n/a',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
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
        command_category: ClientCommandHelper.categories.FUN_STUFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.inCachedGuild()) return;
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.channel) return;

        const ephemeral = interaction.options.getBoolean('ephemeral', false) ?? false;
        await interaction.deferReply({ ephemeral: ephemeral });

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Loading...',
                }),
            ],
        });

        const random_identity_api_response_data = await axios({
            method: 'get',
            url: `https://randomuser.me/api?v=${Date.now()}`,
            validateStatus: (status_code) => status_code === 200,
        }).then((response) => response.data as RandomIdentityApiResponseData);

        const random_identity_data = random_identity_api_response_data.results.at(0)!;

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Generated Random Identity',
                    description: `${interaction.user}, the following information is fake.`,
                    thumbnail: {
                        url: random_identity_data.picture.large,
                    },
                    fields: [
                        {
                            name: 'Name',
                            value: `${random_identity_data.name.title} ${random_identity_data.name.first} ${random_identity_data.name.last}`,
                            inline: false,
                        }, {
                            name: 'Location',
                            value: [
                                `${random_identity_data.location.street.number} ${random_identity_data.location.street.name}`,
                                `${random_identity_data.location.city}`,
                                `${random_identity_data.location.state}`,
                                `${random_identity_data.location.country}`,
                            ].join(', '),
                            inline: false,
                        }, {
                            name: 'Birthday',
                            value: `<t:${isoTimestampToDiscordTimestamp(random_identity_data.dob.date)}:f> (<t:${isoTimestampToDiscordTimestamp(random_identity_data.dob.date)}:R>)`,
                            inline: false,
                        }, {
                            name: 'Registered On',
                            value: `<t:${isoTimestampToDiscordTimestamp(random_identity_data.registered.date)}:f> (<t:${isoTimestampToDiscordTimestamp(random_identity_data.registered.date)}:R>)`,
                            inline: false,
                        }, {
                            name: 'Email',
                            value: `${random_identity_data.email}`,
                            inline: true,
                        }, {
                            name: 'Username',
                            value: `${random_identity_data.login.username}`,
                            inline: true,
                        }, {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        }, {
                            name: 'Phone',
                            value: `${random_identity_data.phone}`,
                            inline: true,
                        }, {
                            name: 'Cell',
                            value: `${random_identity_data.cell}`,
                            inline: true,
                        }, {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        },
                    ],
                    footer: {
                        text: 'Generated by https://randomuser.me/',
                    },
                }),
            ],
        });
    },
});
