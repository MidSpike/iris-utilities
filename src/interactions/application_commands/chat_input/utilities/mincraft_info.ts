//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'minecraft_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays information about a minecraft user or server',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
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
                type: Discord.ApplicationCommandOptionType.String,
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
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.UTILITIES,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const bot_message = await interaction.followUp({
            fetchReply: true,
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        if (!(bot_message instanceof Discord.Message)) return;

        const query_type = interaction.options.getString('type', true);
        const query_value = interaction.options.getString('query', true);

        switch (query_type) {
            case 'user': {
                const response_data: {
                    player: {
                        id: string,
                        username: string,
                        meta: {
                            name_history: { name: string, changedToAt: number }[],
                        },
                    },
                } | undefined = await axios({
                    method: 'get',
                    url: `https://playerdb.co/api/player/minecraft/${encodeURIComponent(query_value)}`,
                    validateStatus: (status_code) => status_code === 200,
                }).then(response => response.data?.data).catch(() => undefined);

                const mc_user_uuid = response_data?.player?.id;

                if (!mc_user_uuid) {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
                                title: 'MC User > Error',
                                description: `${interaction.user}, unable to find a user matching: \`${query_value}\``,
                            }),
                        ],
                    });
                    return;
                }

                const mc_user_username = response_data?.player?.username;
                const mc_user_name_history = response_data?.player?.meta?.name_history;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_body_image = `https://crafatar.com/renders/body/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_skin_image = `https://crafatar.com/skins/${encodeURIComponent(mc_user_uuid)}`;

                await bot_message.edit({
                    embeds: [
                        CustomEmbed.from({
                            title: `MC User > ${Discord.escapeMarkdown(mc_user_username)}`,
                            fields: [
                                {
                                    name: 'UUID',
                                    value: mc_user_uuid,
                                    inline: false,
                                }, {
                                    name: 'Name History',
                                    value: (mc_user_name_history ? (
                                        mc_user_name_history.map(({ name, changedToAt }) => `${Discord.escapeMarkdown(name)} ${changedToAt ? `(<t:${`${changedToAt}`.slice(0, -3)}:f>)` : ''}`).join('\n')
                                    ) : (
                                        'No name history was found'
                                    )),
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
                const response_data: {
                    debug: {
                        ping: number,
                    },
                    ip: string,
                    icon: string,
                    hostname: string,
                    software: string,
                    version: string,
                    online: boolean,
                    motd: {
                        clean: string[],
                    },
                    players: {
                        online: number,
                        max: number,
                    },
                } | undefined = await axios({
                    method: 'get',
                    url: `https://api.mcsrvstat.us/2/${encodeURIComponent(query_value)}`,
                    validateStatus: (status_code) => status_code === 200,
                }).then(response => response.data).catch(() => undefined);

                const mc_server_info_found = response_data?.debug?.ping;

                if (!mc_server_info_found) {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
                                title: 'MC Server > Error',
                                description: `${interaction.user}, unable to find a server matching: \`${query_value}\``,
                            }),
                        ],
                    });
                    return;
                }

                const mc_server_info_ip = response_data?.ip;
                const mc_server_info_raw_icon = response_data?.icon;
                const mc_server_info_hostname = response_data?.hostname;
                const mc_server_info_software = response_data?.software;
                const mc_server_info_version = response_data?.version;
                const mc_server_info_online = response_data?.online;
                const mc_server_info_motd_clean = response_data?.motd?.clean;
                const mc_server_info_players = response_data?.players?.online;
                const mc_server_info_max_players = response_data?.players?.max;

                const mc_server_info_icon_base64 = (mc_server_info_raw_icon ?? '').split(',')[1] || null;
                const mc_server_info_icon_buffer = mc_server_info_icon_base64 ? Buffer.from(mc_server_info_icon_base64, 'base64') : null;
                const mc_server_info_icon_attachment_name = 'mc-server-icon.png';
                const mc_server_info_icon_attachment = mc_server_info_icon_buffer ? new Discord.AttachmentBuilder(mc_server_info_icon_buffer, { name: mc_server_info_icon_attachment_name }) : null;

                await bot_message.edit({
                    embeds: [
                        CustomEmbed.from({
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
