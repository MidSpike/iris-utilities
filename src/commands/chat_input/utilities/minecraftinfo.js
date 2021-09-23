'use strict';

//------------------------------------------------------------//

const axios = require('axios');
const Discord = require('discord.js');

const { array_chunks } = require('../../../common/lib/utilities');
const { CustomEmbed } = require('../../../common/app/message');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'minecraftinfo',
    description: 'displays information about a minecraft user or server',
    category: ClientCommand.categories.get('UTILITIES'),
    options: [
        {
            type: 'STRING',
            name: 'type',
            description: 'the query type to lookup',
            choices: [
                {
                    name: 'User',
                    value: 'user',
                }, {
                    name: 'Server',
                    value: 'server',
                },
            ],
            required: true,
        }, {
            type: 'STRING',
            name: 'query',
            description: 'the query value to lookup',
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

        const bot_message = await command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: 'Loading...',
                }),
            ],
        });

        const query_type = command_interaction.options.get('type')?.value;
        const query_value = command_interaction.options.get('query')?.value;

        switch (query_type) {
            case 'user': {
                const {
                    data: {
                        data: {
                            player: {
                                id: mc_user_uuid,
                                username: mc_user_username,
                                meta: {
                                    name_history: mc_user_name_history,
                                },
                            },
                        },
                    }
                } = await axios.get(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(query_value)}`).catch(() => ({
                    data: {
                        data: {
                            player: {
                                id: null,
                                username: null,
                                meta: {
                                    name_history: null,
                                },
                            },
                        },
                    },
                }));

                if (!mc_user_uuid) {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                description: `Unable to find a user matching: \`${query_value}\``,
                            }),
                        ],
                    });
                    return;
                }

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_body_image = `https://crafatar.com/renders/body/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_skin_image = `https://crafatar.com/skins/${encodeURIComponent(mc_user_uuid)}`;

                await bot_message.edit({
                    embeds: [
                        new CustomEmbed({
                            title: `MC User > ${mc_user_username}`,
                            fields: [
                                {
                                    name: 'UUID',
                                    value: mc_user_uuid,
                                    inline: false,
                                }, {
                                    name: 'Name History',
                                    value: mc_user_name_history.map(({ name, changedToAt }) => `${name} (<t:${`${changedToAt ?? Date.now()}`.slice(0, -3)}:f>)`).join('\n'),
                                    inline: false,
                                }, {
                                    name: 'Avatar',
                                    value: `[Image](${mc_avatar_image})`,
                                    inline: true,
                                }, {
                                    name: 'Body',
                                    value: `[Image](${mc_body_image})`,
                                    inline: true,
                                }, {
                                    name: 'Skin',
                                    value: `[Image](${mc_skin_image})`,
                                    inline: true,
                                },
                            ],
                            thumbnail: {
                                url: mc_avatar_image,
                            },
                            image: {
                                url: mc_body_image,
                            },
                        }),
                    ],
                });

                break;
            }

            case 'server': {
                await bot_message.edit({
                    embeds: [
                        new CustomEmbed({
                            title: 'Server > SERVER_NAME',
                        }),
                    ],
                });

                break;
            }

            default: {
                break;
            }
        }
    },
});
