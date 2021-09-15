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
    name: 'guildinfo',
    description: 'displays various information about a guild',
    category: ClientCommand.categories.get('UTILITIES'),
    options: [],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        const guild = command_interaction.guild;

        const bot_message = await command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: 'Loading...',
                }),
            ],
        });

        const guild_members = await guild.members.fetch(); // cache all members

        const guild_roles = guild.roles.cache.sort((a, b) => a.position - b.position).map(role => `${role}`);
        const guild_role_chunks = array_chunks(guild_roles, 25);

        const guild_emojis = guild.emojis.cache.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1).map((guild_emoji) => `${guild_emoji}`);
        const guild_emoji_chunks = array_chunks(guild_emojis, 5);

        /**
         * @param {'default'|'roles'|'emojis'|'features'|'channels'|'media'} mode
         */
        async function updateBotMessage(mode) {
            switch (mode) {
                case 'roles': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild information!',
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...guild_role_chunks.map((guild_roles_chunk, chunk_index, guild_roles_chunks) => ({
                                        name: `Roles ${chunk_index+1}/${guild_roles_chunks.length}`,
                                        value: `${guild_roles_chunk.join(' - ')}`,
                                    })),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'emojis': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild information!',
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Emojis',
                                        value: guild_emoji_chunks.map((guild_emoji_chunk) => guild_emoji_chunk.join('')).join('\n'),
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'features': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild information!',
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Features',
                                        value: `${guild.features.length > 0 ? guild.features.map(feature_flag => `- \`${feature_flag}\``).join('\n') : '\`n/a\`'}`,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'channels': {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild information!',
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...[
                                        (guild.afkChannel ? {
                                            name: 'AFK Channel',
                                            value: `${guild.afkChannel}`,
                                            inline: false,
                                        } : undefined),
                                        (guild.rulesChannel ? {
                                            name: 'Rules Channel',
                                            value: `${guild.rulesChannel}`,
                                            inline: false,
                                        } : undefined),
                                        (guild.systemChannel ? {
                                            name: 'System Channel',
                                            value: `${guild.systemChannel}`,
                                            inline: false,
                                        } : undefined),
                                        (guild.publicUpdatesChannel ? {
                                            name: 'Public Updates Channel',
                                            value: `${guild.publicUpdatesChannel}`,
                                            inline: false,
                                        } : undefined),
                                        (guild.widgetChannel ? {
                                            name: 'Widget Channel',
                                            value: `${guild.widgetChannel}`,
                                            inline: false,
                                        } : undefined),
                                    ].filter(item => !!item),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'media': {
                    const guild_icon_url = guild.iconURL({ format: 'png', size: 4096, dynamic: true });

                    const guild_banner_url = guild.bannerURL({ format: 'png', size: 4096, dynamic: true });

                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild information!',
                                thumbnail: {
                                    url: guild_icon_url,
                                },
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Icon',
                                        value: `\`${guild_icon_url || 'n/a'}\``,
                                        inline: false,
                                    }, {
                                        name: 'Banner',
                                        value: `\`${guild_banner_url || 'n/a'}\``,
                                        inline: false,
                                    },
                                ],
                                image: {
                                    url: guild_banner_url,
                                },
                            }),
                        ],
                    });

                    break;
                }

                default: {
                    await bot_message.edit({
                        embeds: [
                            new CustomEmbed({
                                title: 'Don\'t go wild with this guild information!',
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Creation Date',
                                        value: `${'```'}\n${moment(guild.createdTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Description',
                                        value: `${'```'}\n${guild.description || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    },

                                    // {
                                    //     name: '\u200b',
                                    //     value: '\u200b',
                                    //     inline: false,
                                    // },

                                    {
                                        name: 'Owner',
                                        value: `<@!${guild.ownerId}>`,
                                        inline: true,
                                    }, {
                                        name: 'Discord Partner',
                                        value: `\`${guild.partnered ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Verified By Discord',
                                        value: `\`${guild.verified ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Moderation Level',
                                        value: `\`${guild.verificationLevel ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Explicit Content Filter',
                                        value: `\`${guild.explicitContentFilter ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Preferred Locale',
                                        value: `\`${guild.preferredLocale ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'NSFW Level',
                                        value: `\`${guild.nsfwLevel ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Booster Level',
                                        value: `\`${guild.premiumTier ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Boosters',
                                        value: `\`${guild.premiumSubscriptionCount ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Invites',
                                        value: `\`${guild.invites.cache.size ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Roles',
                                        value: `\`${guild.roles.cache.size ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Channels',
                                        value: `\`${guild.channels.cache.size ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Bots',
                                        value: `\`${guild_members.filter(m => m.user.bot).size ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Members',
                                        value: `\`${guild_members.filter(m => !m.user.bot).size ?? 'n/a'}\``,
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
                            custom_id: 'roles',
                            label: 'Roles',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'emojis',
                            label: 'Emojis',
                        },
                    ],
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'media',
                            label: 'Media',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'features',
                            label: 'Features',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'channels',
                            label: 'Channels',
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
