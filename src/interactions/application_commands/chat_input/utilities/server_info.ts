//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CachedMap, CachedMapData, arrayChunks } from '@root/common/lib/utilities';

import { CustomEmbed, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

type GuildInfoCacheData = {
    members_count: number;
    bots_count: number;
    roles_count: number;
    channels_count: number;
    invites_count: number;
    emojis_count: number;
    bans_count: number;
};

const guild_info_cache = new CachedMap<string, CachedMapData<GuildInfoCacheData>>();

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'server_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays information about this server',
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
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

        await interaction.deferReply();

        const guild_resolvable = interaction.guild;
        const guild = await interaction.client.guilds.fetch({ guild: guild_resolvable, withCounts: true });

        const bot_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        const guild_info_cache_data = await guild_info_cache.ensure(guild.id, async () => {
            const guild_members = await guild.members.fetch(); // fetch all members
            const guild_non_bots_count: number = guild_members.filter((member) => !member.user.bot).size;
            const guild_bots_count: number = guild_members.filter((member) => member.user.bot).size;

            const guild_roles_count: number = await guild.roles.fetch().then(
                (guild_roles) => guild_roles.size
            ).catch(
                // this should never happen, but just in-case
                () => 0
            );

            const guild_channels_count: number = await guild.channels.fetch().then(
                // filter out threads
                (guild_channels) => guild_channels.filter((channel) => channel && !channel.isThread()).size
            ).catch(
                // this should never happen, but just in-case
                () => 0
            );

            const guild_invites_count: number = await guild.invites.fetch().then(
                (guild_invites) => guild_invites.size
            ).catch(
                // the most likely reason for this to fail is if the bot is missing access to the guild's invites
                () => 0
            );

            const guild_emojis_count: number = await guild.emojis.fetch().then(
                (guild_emojis) => guild_emojis.size
            ).catch(
                // the most likely reason for this to fail is if the bot is missing access to the guild's emojis
                () => 0
            );

            const guild_bans_count: number = await guild.bans.fetch().then(
                (guild_bans) => guild_bans.size
            ).catch(
                // the most likely reason for this to fail is if the bot is missing access to the guild's bans
                () => 0
            );

            return {
                expiration_epoch: Date.now() + (5 * 60_000), // 5 minutes from now in milliseconds
                data: {
                    members_count: guild_non_bots_count,
                    bots_count: guild_bots_count,
                    roles_count: guild_roles_count,
                    channels_count: guild_channels_count,
                    invites_count: guild_invites_count,
                    emojis_count: guild_emojis_count,
                    bans_count: guild_bans_count,
                },
            };
        });

        const guild_roles = guild.roles.cache.sort(
            // sort by position (ascending from `0` to `infinity`)
            (a, b) => a.position - b.position
        ).map((role) => `${role}`);
        const guild_role_chunks = arrayChunks(guild_roles, 25);

        const guild_emojis = guild.emojis.cache.sort(
            // sort by name alphabetically (ascending from `a` to `z`)
            (a, b) => a.name!.toLowerCase() > b.name!.toLowerCase() ? 1 : -1
        ).map((guild_emoji) => `${guild_emoji}`);
        const guild_emoji_chunks = arrayChunks(guild_emojis, 25);

        type GuildInfoSectionName = (
            | 'serverinfo_btn_default'
            | 'serverinfo_btn_roles'
            | 'serverinfo_btn_emojis'
            | 'serverinfo_btn_features'
            | 'serverinfo_btn_channels'
            | 'serverinfo_btn_media'
        );

        async function updateBotMessage(mode: GuildInfoSectionName) {
            switch (mode) {
                case 'serverinfo_btn_roles': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
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
                                        name: `Roles ${chunk_index + 1}/${guild_roles_chunks.length}`,
                                        value: `${guild_roles_chunk.join(' - ')}`,
                                    })),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'serverinfo_btn_emojis': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
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

                                    ...guild_emoji_chunks.map((guild_emoji_chunk, chunk_index, guild_emoji_chunks) => ({
                                        name: `Emojis ${chunk_index + 1}/${guild_emoji_chunks.length}`,
                                        value: arrayChunks(guild_emoji_chunk, 5).map((guild_emoji_mini_chunk) => guild_emoji_mini_chunk.join('')).join('\n'),
                                    })),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'serverinfo_btn_features': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
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
                                        value: (guild.features.length > 0 ? guild.features.map((feature_flag) => `- \`${feature_flag}\``).join('\n') : '\`n/a\`'),
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'serverinfo_btn_channels': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
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

                                    ...(guild.afkChannel ? [
                                        {
                                            name: 'AFK Channel',
                                            value: `${guild.afkChannel}`,
                                            inline: false,
                                        },
                                    ] : []),
                                    ...(guild.rulesChannel ? [
                                        {
                                            name: 'Rules Channel',
                                            value: `${guild.rulesChannel}`,
                                            inline: false,
                                        },
                                    ] : []),
                                    ...(guild.systemChannel ? [
                                        {
                                            name: 'System Channel',
                                            value: `${guild.systemChannel}`,
                                            inline: false,
                                        },
                                    ] : []),
                                    ...(guild.publicUpdatesChannel ? [
                                        {
                                            name: 'Public Updates Channel',
                                            value: `${guild.publicUpdatesChannel}`,
                                            inline: false,
                                        },
                                    ] : []),
                                    ...(guild.safetyAlertsChannel ? [
                                        {
                                            name: 'Safety Alerts Channel',
                                            value: `${guild.safetyAlertsChannel}`,
                                            inline: false,
                                        },
                                    ] : []),
                                    ...(guild.widgetChannel ? [
                                        {
                                            name: 'Widget Channel',
                                            value: `${guild.widgetChannel}`,
                                            inline: false,
                                        },
                                    ] : []),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'serverinfo_btn_media': {
                    const guild_icon_url = guild.iconURL({ forceStatic: false, size: 4096 });
                    const guild_banner_url = guild.bannerURL({ forceStatic: false, size: 4096 });
                    const guild_splash_url = guild.splashURL({ forceStatic: false, size: 4096 });
                    const guild_discovery_splash_url = guild.discoverySplashURL({ forceStatic: false, size: 4096 });

                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
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
                                        name: 'Icon',
                                        value: `${guild_icon_url ? `[Image](${guild_icon_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    }, {
                                        name: 'Banner',
                                        value: `${guild_banner_url ? `[Image](${guild_banner_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    }, {
                                        name: 'Splash',
                                        value: `${guild_splash_url ? `[Image](${guild_splash_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    }, {
                                        name: 'Discovery Splash',
                                        value: `${guild_discovery_splash_url ? `[Image](${guild_discovery_splash_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    },
                                ],
                                ...(guild_icon_url ? {
                                    image: {
                                        url: guild_icon_url,
                                    },
                                } : {}),
                            }),
                        ],
                    });

                    break;
                }

                default: {
                    const guild_created_timestamp_epoch = `${guild.createdTimestamp}`.slice(0, -3);

                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild information!',
                                fields: [
                                    {
                                        name: 'Name',
                                        value: `${'```'}\n${guild.name}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Description',
                                        value: `${'```'}\n${guild.description || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${guild.id}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Created On',
                                        value: `<t:${guild_created_timestamp_epoch}:F> (<t:${guild_created_timestamp_epoch}:R>)`,
                                        inline: false,
                                    },

                                    // {
                                    //     name: '\u200b',
                                    //     value: '\u200b',
                                    //     inline: false,
                                    // },

                                    {
                                        name: 'Owner',
                                        value: `<@${guild.ownerId}>`,
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
                                        value: `\`${Discord.GuildVerificationLevel[guild.verificationLevel] ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Explicit Content Filter',
                                        value: `\`${Discord.GuildExplicitContentFilter[guild.explicitContentFilter] ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Preferred Locale',
                                        value: `\`${guild.preferredLocale ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'NSFW Level',
                                        value: `\`${Discord.GuildNSFWLevel[guild.nsfwLevel] ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Boost Level',
                                        value: `\`${Discord.GuildPremiumTier[guild.premiumTier] ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Boosts',
                                        value: `\`${guild.premiumSubscriptionCount ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Invites',
                                        value: `\`${guild_info_cache_data.data.invites_count ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Roles',
                                        value: `\`${guild_info_cache_data.data.roles_count ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Channels',
                                        value: `\`${guild_info_cache_data.data.channels_count ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Bots',
                                        value: `\`${guild_info_cache_data.data.bots_count ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Members',
                                        value: `\`${guild_info_cache_data.data.members_count ?? 'n/a'}\``,
                                        inline: true,
                                    }, {
                                        name: 'Bans',
                                        value: `\`${guild_info_cache_data.data.bans_count ?? 'n/a'}\``,
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

        await updateBotMessage('serverinfo_btn_default');

        await bot_message.edit({
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'serverinfo_btn_default',
                            label: 'Information',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'serverinfo_btn_roles',
                            label: 'Roles',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'serverinfo_btn_emojis',
                            label: 'Emojis',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'serverinfo_btn_media',
                            label: 'Media',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'serverinfo_btn_features',
                            label: 'Features',
                        },
                    ],
                },
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'serverinfo_btn_channels',
                            label: 'Channels',
                        },
                    ],
                },
            ],
        });

        const message_button_collector = bot_message.createMessageComponentCollector({
            filter: (button_interaction) => button_interaction.user.id === interaction.user.id,
            time: 5 * 60_000, // 5 minutes
        });

        message_button_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();
            message_button_collector.resetTimer();

            await updateBotMessage(button_interaction.customId as GuildInfoSectionName);
        });

        message_button_collector.on('end', () => {
            void disableMessageComponents(bot_message);
        });
    },
});
