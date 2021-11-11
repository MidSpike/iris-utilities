'use strict';

//------------------------------------------------------------//

const axios = require('axios');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'minecraftinfo',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'displays information about a minecraft user or server',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
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
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'the query value to lookup',
                required: true,
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

        await interaction.deferReply();

        const bot_message = await interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: 'Loading...',
                }),
            ],
        });

        const query_type = interaction.options.get('type')?.value;
        const query_value = interaction.options.get('query')?.value;

        switch (query_type) {
            case 'user': {
                const {
                    player: {
                        id: mc_user_uuid,
                        username: mc_user_username,
                        meta: {
                            name_history: mc_user_name_history,
                        },
                    },
                } = {
                    player: {
                        id: null,
                        username: null,
                        meta: {
                            name_history: null,
                        },
                    },
                    ...(
                        await axios.get(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(query_value)}`).catch(() => null)
                    )?.data?.data ?? {},
                };

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
                            title: `MC User > ${Discord.Util.escapeMarkdown(mc_user_username)}`,
                            fields: [
                                {
                                    name: 'UUID',
                                    value: mc_user_uuid,
                                    inline: false,
                                }, {
                                    name: 'Name History',
                                    value: mc_user_name_history.map(({ name, changedToAt }) => `${Discord.Util.escapeMarkdown(name)} ${changedToAt ? `(<t:${`${changedToAt}`.slice(0, -3)}:f>)` : ''}`).join('\n'),
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
                const {
                    debug: {
                        ping: mc_server_info_found,
                    },
                    ip: mc_server_info_ip,
                    icon: mc_server_info_raw_icon,
                    hostname: mc_server_info_hostname,
                    software: mc_server_info_software,
                    version: mc_server_info_version,
                    online: mc_server_info_online,
                    motd: {
                        clean: mc_server_info_motd_clean,
                    },
                    players: {
                        online: mc_server_info_players,
                        max: mc_server_info_max_players,
                    },
                } = {
                    debug: {
                        ping: null,
                    },
                    ip: null,
                    icon: null,
                    hostname: null,
                    software: null,
                    version: null,
                    online: null,
                    motd: {
                        clean: null,
                    },
                    players: {
                        online: null,
                        max: null,
                    },
                    ...(
                        await axios.get(`https://api.mcsrvstat.us/2/${encodeURIComponent(query_value)}`).catch(() => null)
                    )?.data ?? {},
                };

                if (!mc_server_info_found) {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                description: `Unable to find a server matching: \`${query_value}\``,
                            }),
                        ],
                    });
                    return;
                }

                const mc_server_info_icon_base64 = (mc_server_info_raw_icon ?? '').split(',')[1] || null;
                const mc_server_info_icon_buffer = mc_server_info_icon_base64 ? Buffer.from(mc_server_info_icon_base64, 'base64') : null;
                const mc_server_info_icon_attachment_name = 'mc-server-icon.png';
                const mc_server_info_icon_attachment = mc_server_info_icon_buffer ? new Discord.MessageAttachment(mc_server_info_icon_buffer, mc_server_info_icon_attachment_name) : null;

                await bot_message.edit({
                    embeds: [
                        new CustomEmbed({
                            title: `MC Server > ${mc_server_info_hostname}`,
                            fields: [
                                ...(mc_server_info_motd_clean ? [
                                    {
                                        name: 'Motd',
                                        value: `\`\`\`${mc_server_info_motd_clean.map(s => s.trim()).join('\n')}\`\`\``,
                                        inline: false,
                                    },
                                ] : []),

                                {
                                    name: 'Status',
                                    value: mc_server_info_online ? 'Online' : 'Offline',
                                    inline: true,
                                }, {
                                    name: 'IP Address',
                                    value: mc_server_info_ip ?? 'n/a',
                                    inline: true,
                                }, {
                                    name: 'Version',
                                    value: mc_server_info_version ?? 'n/a',
                                    inline: true,
                                }, {
                                    name: 'Players',
                                    value: `${mc_server_info_players} / ${mc_server_info_max_players}`,
                                    inline: true,
                                }, {
                                    name: 'Flavour',
                                    value: mc_server_info_software ?? 'Vanilla (unknown)',
                                    inline: true,
                                },
                            ],
                            ...(mc_server_info_icon_attachment ? {
                                thumbnail: {
                                    url: `attachment://${mc_server_info_icon_attachment_name}`,
                                },
                            } : {}),
                        }),
                    ],
                    ...(mc_server_info_icon_attachment ? {
                        files: [
                            mc_server_info_icon_attachment,
                        ],
                    } : {}),
                });

                break;
            }

            default: {
                break;
            }
        }
    },
});
