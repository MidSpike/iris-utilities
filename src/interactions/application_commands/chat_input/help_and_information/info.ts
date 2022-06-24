//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import os from 'node:os';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const bot_support_url = process.env.DISCORD_BOT_SUPPORT_GUILD_INVITE_URL as string;
if (!bot_support_url?.length) throw new Error('DISCORD_BOT_SUPPORT_GUILD_INVITE_URL is undefined or empty');

//------------------------------------------------------------//

const memory_unit_divisor = 1024;
const memory_units = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB' ];

function memoryUsageToSmallestUnit(memory_usage_in_bytes: number): string {
    let memory_usage_in_bytes_clone = memory_usage_in_bytes;

    let memory_unit_index = 0;

    while (memory_usage_in_bytes_clone > memory_unit_divisor) {
        memory_usage_in_bytes_clone /= memory_unit_divisor;
        memory_unit_index += 1;
    }

    return `${Math.round(memory_usage_in_bytes_clone)} ${memory_units[memory_unit_index]}`;
}

//------------------------------------------------------------//

const uptime_units: [string, number][] = [
    ['Seconds', 60],
    ['Minutes', 60],
    ['Hours', 24],
    ['Days', 365],
    ['Years', 10],
    ['Decades', 10],
];

function uptimeToHumanString(uptime_in_seconds: number): string {
    let uptime_in_seconds_clone = uptime_in_seconds;

    let uptime_unit_index = 0;

    while (uptime_in_seconds_clone > uptime_units[uptime_unit_index][1]) {
        uptime_in_seconds_clone /= uptime_units[uptime_unit_index][1];
        uptime_unit_index += 1;
    }

    return `${Math.round(uptime_in_seconds_clone)} ${uptime_units[uptime_unit_index][0]}`;

}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
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
        command_category: ClientCommandHelper.categories.HELP_AND_INFORMATION,
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

        const distributed_bot_info = await discord_client.shard!.broadcastEval((client) => {
            const shard_cached_member_ids = new Set(); // using Set to prevent duplicates

            for (const guild of client.guilds.cache.values()) {
                for (const [ member_id ] of guild.members.cache) {
                    shard_cached_member_ids.add(member_id);
                }
            }

            return {
                ping_ms: client.ws.ping,
                num_cached_guilds: client.guilds.cache.size,
                num_cached_users: shard_cached_member_ids.size,
                num_cached_channels: client.channels.cache.size,
                num_cached_emojis: client.emojis.cache.size,
                shard_info: [
                    `\`[ Shard ${client.shard!.ids.map(shard_id => shard_id + 1).join(', ')} / ${client.shard!.count} ]:\``,
                    `> - ${client.ws.ping}ms ping`,
                    `> - ${client.guilds.cache.size} guild(s)`,
                    `> - ${client.channels.cache.size} channel(s)`,
                    `> - ${shard_cached_member_ids.size} user(s)`,
                    `> - ${client.emojis.cache.size} emoji(s)`,
                ].join('\n'),
            };
        });

        const combined_bot_info_totals = {
            average_ping_ms: distributed_bot_info.reduce((acc, curr) => acc + curr.ping_ms, 0) / distributed_bot_info.length,
            num_cached_guilds: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_guilds, 0),
            num_cached_users: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_users, 0),
            num_cached_channels: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_channels, 0),
            num_cached_emojis: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_emojis, 0),
        };

        const total_system_free_memory = os.freemem();
        const total_system_memory = os.totalmem();
        const total_system_memory_usage = total_system_memory - total_system_free_memory;
        const total_process_memory_usage = process.memoryUsage().heapUsed;
        const total_process_memory = process.memoryUsage().heapTotal;

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
                            name: 'Process Memory Usage',
                            value: [
                                `> ${memoryUsageToSmallestUnit(total_process_memory_usage)} / ${memoryUsageToSmallestUnit(total_process_memory)}`,
                            ].join('\n'),
                            inline: true,
                        }, {
                            name: 'System Memory Usage',
                            value: [
                                `> ${memoryUsageToSmallestUnit(total_system_memory_usage)} / ${memoryUsageToSmallestUnit(total_system_memory)}`,
                            ].join('\n'),
                            inline: true,
                        }, {
                            name: 'Server Information',
                            value: [
                                `> - ${os.version()} (${os.release()})`,
                                `> - ${os.arch()} ${os.cpus().at(0)!.model.replace(/\s+/gi, ' ')} (x${os.cpus().length})`,
                                `> - ${uptimeToHumanString(os.uptime())} of Uptime`,
                            ].join('\n'),
                            inline: false,
                        }, {
                            name: 'Combined Shard Cache',
                            value: [
                                `> - ${combined_bot_info_totals.average_ping_ms}ms average ping`,
                                `> - ${combined_bot_info_totals.num_cached_guilds} total guild(s)`,
                                `> - ${combined_bot_info_totals.num_cached_users} total user(s)`,
                                `> - ${combined_bot_info_totals.num_cached_channels} total channel(s)`,
                                `> - ${combined_bot_info_totals.num_cached_emojis} total emoji(s)`,
                            ].join('\n'),
                        }, {
                            name: 'Individual Shard Caches',
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
