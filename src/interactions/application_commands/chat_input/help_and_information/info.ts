//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const bot_support_url = process.env.DISCORD_BOT_SUPPORT_GUILD_INVITE_URL as string;
if (!bot_support_url?.length) throw new Error('DISCORD_BOT_SUPPORT_GUILD_INVITE_URL is undefined or empty');

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays various information about the bot',
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.get('HELP_AND_INFORMATION'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const bot_application = await discord_client.application.fetch();
        const bot_application_owner = bot_application.owner instanceof Discord.Team ? bot_application.owner.owner!.user : bot_application.owner!;

        const bot_invite_url = discord_client.generateInvite({
            scopes: [
                Discord.OAuth2Scopes.Bot,
                Discord.OAuth2Scopes.ApplicationsCommands,
            ],
            permissions: [
                Discord.PermissionFlagsBits.Administrator,
            ],
        });

        const bot_creation_unix_epoch = Math.floor(discord_client.user.createdTimestamp / 1000);

        const distributed_bot_info = await discord_client.shard!.broadcastEval((client) => ({
            ping_ms: client.ws.ping,
            num_cached_guilds: client.guilds.cache.size,
            num_cached_users: client.users.cache.size,
            num_cached_channels: client.channels.cache.size,
            num_cached_emojis: client.emojis.cache.size,
            shard_info: [
                `\`[ Shard ${client.shard!.ids.map(shard_id => shard_id + 1).join(', ')} / ${client.shard!.count} ]:\``,
                `> - ${client.ws.ping}ms ping`,
                `> - ${client.guilds.cache.size} cached guild(s)`,
                `> - ${client.users.cache.size} cached user(s)`,
                `> - ${client.channels.cache.size} cached channel(s)`,
                `> - ${client.emojis.cache.size} cached emoji(s)`,
            ].join('\n'),
        }));

        const combined_bot_info_totals = {
            average_ping_ms: distributed_bot_info.reduce((acc, curr) => acc + curr.ping_ms, 0) / distributed_bot_info.length,
            num_cached_guilds: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_guilds, 0),
            num_cached_users: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_users, 0),
            num_cached_channels: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_channels, 0),
            num_cached_emojis: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_emojis, 0),
        };

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: `Hello world, I\'m ${discord_client.user.username}`,
                    description: [
                        `I was created by ${bot_application_owner.username} <t:${bot_creation_unix_epoch}:R> on <t:${bot_creation_unix_epoch}:D>.`,
                    ].join('\n'),
                    fields: [
                        {
                            name: 'About Me',
                            value: `${bot_application.description}`,
                        }, {
                            name: 'Combined Shard Info',
                            value: [
                                `> - ${combined_bot_info_totals.average_ping_ms}ms average ping`,
                                `> - ${combined_bot_info_totals.num_cached_guilds} total cached guild(s)`,
                                `> - ${combined_bot_info_totals.num_cached_users} total cached user(s)`,
                                `> - ${combined_bot_info_totals.num_cached_channels} total cached channel(s)`,
                                `> - ${combined_bot_info_totals.num_cached_emojis} total cached emoji(s)`,
                            ].join('\n'),
                        }, {
                            name: 'Individual Shard Info',
                            value: [
                                distributed_bot_info.map(({ shard_info }) => shard_info).join('\n\n'),
                            ].join('\n'),
                        },
                    ],
                }),
            ],
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Link,
                            label: 'Invite Me',
                            url: `${bot_invite_url}`,
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Link,
                            label: 'Support Server',
                            url: `${bot_support_url}`,
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Link,
                            label: 'Website',
                            url: 'https://iris-utilities.com/',
                        },
                    ],
                }, {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Link,
                            label: 'Donate',
                            url: 'https://github.com/sponsors/MidSpike',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Link,
                            label: 'Source Code',
                            url: 'https://github.com/MidSpike/iris-utilities',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Link,
                            label: 'Privacy Policy',
                            url: 'https://iris-utilities.com/pages/privacy.html',
                        },
                    ],
                },
            ],
        });
    },
});
