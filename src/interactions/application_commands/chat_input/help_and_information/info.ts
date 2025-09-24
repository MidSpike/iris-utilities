//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import os from 'node:os';

import * as Discord from 'discord.js';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const bot_support_url = parseEnvironmentVariable(EnvironmentVariableName.DiscordBotSupportGuildInviteUrl, 'string');

//------------------------------------------------------------//

const memory_unit_divisor = 1024;
const memory_units = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB' ];

/**
 * Returns a string representation of the given number of bytes in the largest sensible unit.
 * @example
 * ```ts
 * bytesToLargestRepresentation(5 * 1024 * 1024) // output: '5 MB'
 * ```
 */
function bytesToLargestRepresentation(memory_usage_in_bytes: number): string {
    let memory_usage_in_bytes_clone = Math.floor(memory_usage_in_bytes);

    let memory_unit_index = 0;

    while (memory_usage_in_bytes_clone > memory_unit_divisor) {
        memory_usage_in_bytes_clone /= memory_unit_divisor;
        memory_unit_index += 1;
    }

    return `${Math.round(memory_usage_in_bytes_clone)} ${memory_units[memory_unit_index]}`;
}

//------------------------------------------------------------//

type UptimeUnitTuple = [
    unit_name: string, // example: `'seconds'`
    units_per_next_unit: number, // example: `60` (seconds per minute)
];

const uptime_units: UptimeUnitTuple[] = [
    [ 'seconds', 60 ],
    [ 'minutes', 60 ],
    [ 'hours', 24 ],
    [ 'days', 365 ],
    [ 'years', 10 ],
    [ 'decades', 10 ],
];

/**
 * Returns a string representation of the given number of seconds in the largest sensible unit (up to decades).
 * @example
 * ```ts
 * uptimeToHumanString(1 * 60 * 60 * 24 * 365) // output: '1 year'
 * ```
 */
function uptimeToHumanString(uptime_in_seconds: number): string {
    let uptime_in_seconds_clone = Math.floor(uptime_in_seconds);

    let uptime_unit_index = 0;

    while (uptime_in_seconds_clone > uptime_units[uptime_unit_index]![1]) {
        uptime_in_seconds_clone /= uptime_units[uptime_unit_index]![1];
        uptime_unit_index += 1;
    }

    return `${Math.round(uptime_in_seconds_clone)} ${uptime_units[uptime_unit_index]![0]}`;
}

//------------------------------------------------------------//

/**
 * Formats the given CPU model name string.
 * Removes most non-alphanumeric characters, common legal affixes, and duplicate whitespace.
 */
function formatCpuModelName(
    cpu_model_name: string,
): string {
    return cpu_model_name
        .replace(/\((c|r|tm)\)/gi, '')
        .replace(/[^a-zA-Z0-9\s\.\,\_\-]/gi, '')
        .replace(/\s+/gi, ' ');
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
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
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

        await interaction.deferReply();

        const bot_application = await discord_client.application.fetch();
        const bot_application_owner: Discord.User | null | undefined = bot_application.owner instanceof Discord.Team ? bot_application.owner.owner?.user : bot_application.owner;

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

        const distributed_bot_info = await discord_client.shard.broadcastEval((client) => {
            if (!client.isReady()) throw new Error('Client is not ready');
            if (!client.shard) throw new Error('Client shard is undefined');

            // import at runtime since the shard's `process` is not accessible otherwise
            const shard_process = require('node:process') as NodeJS.Process;

            const shard_cached_member_ids = new Set<string>(); // remove duplicates by using a set

            for (const guild of client.guilds.cache.values()) {
                for (const [ member_id ] of guild.members.cache) {
                    shard_cached_member_ids.add(member_id);
                }
            }

            return {
                identifier: client.shard.ids.map((shard_id) => shard_id + 1).join(', '),
                ping_ms: client.ws.ping,
                process_info: {
                    uptime_in_seconds: shard_process.uptime(),
                    memory_usage_in_bytes: shard_process.memoryUsage().heapUsed,
                    memory_allocation_in_bytes: shard_process.memoryUsage().heapTotal,
                },
                num_cached_guilds: client.guilds.cache.size,
                num_cached_users: shard_cached_member_ids.size,
                num_cached_channels: client.channels.cache.size,
                num_cached_emojis: client.emojis.cache.size,
            };
        });

        const combined_bot_info_totals = {
            average_ping_ms: Math.round(distributed_bot_info.reduce((acc, curr) => acc + curr.ping_ms, 0) / distributed_bot_info.length),
            total_process_memory_usage_in_bytes: distributed_bot_info.reduce((acc, curr) => acc + curr.process_info.memory_usage_in_bytes, 0),
            total_process_memory_allocation_in_bytes: distributed_bot_info.reduce((acc, curr) => acc + curr.process_info.memory_allocation_in_bytes, 0),
            num_cached_guilds: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_guilds, 0),
            num_cached_users: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_users, 0),
            num_cached_channels: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_channels, 0),
            num_cached_emojis: distributed_bot_info.reduce((acc, cur) => acc + cur.num_cached_emojis, 0),
        };

        const total_system_free_memory = os.freemem();
        const total_system_memory = os.totalmem();
        const total_system_memory_usage = total_system_memory - total_system_free_memory;

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: `Hello world, I\'m ${discord_client.user.username}`,
                    description: [
                        `I was created by ${bot_application_owner?.username ?? 'Unknown'} <t:${bot_creation_unix_epoch}:R> on <t:${bot_creation_unix_epoch}:D>.`,
                    ].join('\n'),
                    fields: [
                        {
                            name: 'About Me',
                            value: `${bot_application.description}`,
                            inline: false,
                        }, {
                            name: 'Server Information',
                            value: [
                                `> Uptime: ${uptimeToHumanString(os.uptime())}`,
                                `> Operating System: ${os.arch()} ${os.version()}`,
                                `> Processor: ${formatCpuModelName(os.cpus().at(0)!.model)} (x${os.cpus().length})`,
                                `> Memory: ${bytesToLargestRepresentation(total_system_memory_usage)} used / ${bytesToLargestRepresentation(total_system_memory)} allocated`,
                            ].join('\n'),
                            inline: false,
                        }, {
                            name: 'Cluster Information',
                            value: [
                                `> ${combined_bot_info_totals.average_ping_ms}ms & (${bytesToLargestRepresentation(combined_bot_info_totals.total_process_memory_usage_in_bytes)} / ${bytesToLargestRepresentation(combined_bot_info_totals.total_process_memory_allocation_in_bytes)})`,
                                `> ${combined_bot_info_totals.num_cached_guilds} guild(s)`,
                                `> ${combined_bot_info_totals.num_cached_users} user(s)`,
                                `> ${combined_bot_info_totals.num_cached_channels} channel(s)`,
                                `> ${combined_bot_info_totals.num_cached_emojis} emoji(s)`,
                            ].join('\n'),
                            inline: false,
                        }, {
                            name: 'Shard Information',
                            value: [
                                distributed_bot_info.map(
                                    ({
                                        identifier,
                                        ping_ms,
                                        process_info: {
                                            memory_usage_in_bytes,
                                            memory_allocation_in_bytes,
                                        },
                                        num_cached_guilds,
                                        num_cached_channels,
                                        num_cached_users,
                                        num_cached_emojis,
                                    }) => [
                                        `\`[ Shard ${identifier} / ${discord_client.shard.count} ]:\``,
                                        `> ${ping_ms}ms & (${bytesToLargestRepresentation(memory_usage_in_bytes)} / ${bytesToLargestRepresentation(memory_allocation_in_bytes)})`,
                                        `> ${num_cached_guilds} guild(s)`,
                                        `> ${num_cached_channels} channel(s)`,
                                        `> ${num_cached_users} user(s)`,
                                        `> ${num_cached_emojis} emoji(s)`,
                                    ].join('\n')
                                ).join('\n\n'),
                            ].join('\n'),
                            inline: false,
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
