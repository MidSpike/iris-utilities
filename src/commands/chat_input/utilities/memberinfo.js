'use strict';

//------------------------------------------------------------//

const moment = require('moment-timezone');
const Discord = require('discord.js');

const { array_chunks } = require('../../../common/lib/utilities');
const { CustomEmbed } = require('../../../common/app/message');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'memberinfo',
    description: 'displays information about a guild member',
    category: ClientCommand.categories.get('UTILITIES'),
    options: [
        {
            type: 'USER',
            name: 'member',
            description: 'the guild member to lookup',
            required: false,
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

        await command_interaction.guild.members.fetch(); // cache all members

        const member_id = command_interaction.options.get('member')?.value ?? command_interaction.member.id;
        const member = await command_interaction.guild.members.fetch(member_id);

        const everyone_permissions = command_interaction.guild.roles.everyone.permissions.toArray();
        const member_permissions = member.permissions.toArray().filter(permission_flag => !everyone_permissions.includes(permission_flag));

        const member_user_flags = member.user.flags?.toArray() ?? [];

        const member_roles = member.roles.cache.sort((a, b) => a.position - b.position).map(role => `${role}`);

        /**
         * @param {'default'|'flags'|'media'|'permissions'|'roles'} mode
         */
        async function updateBotMessage(mode) {
            switch (mode) {
                case 'flags': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Flags',
                                        value: `${'```'}\n${member_user_flags.length > 1 ? member_user_flags.join('\n') : 'NO_FLAGS'}\n${'```'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'media': {
                    const member_icon_url = member.user.displayAvatarURL({ format: 'png', size: 4096, dynamic: true });

                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Icon',
                                        value: `\`${member_icon_url || 'n/a'}\``,
                                        inline: false,
                                    },
                                ],
                                image: {
                                    url: member_icon_url,
                                },
                            }),
                        ],
                    });

                    break;
                }

                case 'permissions': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Unique Permissions',
                                        value: `${'```'}\n${member_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : member_permissions.join('\n') || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Inherited Permissions',
                                        value: `${'```'}\n${everyone_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'roles': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...array_chunks(member_roles, 32).map((member_roles_chunk, chunk_index, member_roles_chunks) => ({
                                        name: `Roles ${chunk_index+1}/${member_roles_chunks.length}`,
                                        value: `${member_roles_chunk.join(' - ')}`,
                                        inline: false,
                                    })),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                default: {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...(member.nickname ? [
                                        {
                                            name: 'Nickname',
                                            value: `${'```'}\n${member.nickname}\n${'```'}`,
                                            inline: false,
                                        },
                                    ] : []),

                                    {
                                        name: 'Account Creation Date',
                                        value: `${'```'}\n${moment(member.user.createdTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Joined Guild Date',
                                        value: `${'```'}\n${moment(member.joinedTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                                        inline: false,
                                    },

                                    (member.premiumSinceTimestamp ? [
                                        {
                                            name: 'Boosting Since Date',
                                            value: `${'```'}\n${moment(member.premiumSinceTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                                            inline: false,
                                        },
                                    ]: []),

                                    {
                                        name: 'Bot',
                                        value: `\`${member.user.bot}\``,
                                        inline: true,
                                    }, {
                                        name: 'System',
                                        value: `\`${member.user.system}\``,
                                        inline: true,
                                    }, {
                                        name: 'Manageable',
                                        value: `\`${member.manageable}\``,
                                        inline: true,
                                    }, {
                                        name: 'Kickable',
                                        value: `\`${member.kickable}\``,
                                        inline: true,
                                    }, {
                                        name: 'Bannable',
                                        value: `\`${member.bannable}\``,
                                        inline: true,
                                    }, {
                                        name: 'Display Color',
                                        value: `\`${member.displayHexColor}\``,
                                        inline: true,
                                    }, {
                                        name: '\u200b',
                                        value: '\u200b',
                                        inline: true,
                                    },
                                ],
                            }),
                        ],
                    }).catch(console.warn);

                    break;
                }
            }
        }

        await updateBotMessage('default');

        await bot_message.edit({
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'default',
                            label: 'Information',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'flags',
                            label: 'Flags',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'media',
                            label: 'Media',
                        },
                    ],
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'permissions',
                            label: 'Permissions',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'roles',
                            label: 'Roles',
                        },
                    ],
                },
            ],
        });

        const message_button_collector = bot_message.createMessageComponentCollector({
            filter: (button_interaction) => button_interaction.user.id === command_interaction.user.id,
            time: 5 * 60_000, // 5 minutes
        });

        message_button_collector.on('collect', async (button_interaction) => {
            message_button_collector.resetTimer();
            await button_interaction.deferUpdate();

            if (message_button_collector.ended) return;

            await updateBotMessage(button_interaction.customId);
        });

        message_button_collector.on('end', async () => {
            await bot_message.delete().catch(console.warn);
        });
    },
});
