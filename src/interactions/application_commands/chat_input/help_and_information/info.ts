'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

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
        const bot_application_owner_id = bot_application.owner instanceof Discord.Team ? bot_application.owner.owner!.user.id : bot_application.owner!.id;

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

        const distributed_bot_sharding_info = await discord_client.shard!.broadcastEval((client) => [
                `[ shard ${client.shard!.ids.join(', ')} ]:`,
                `> - ${client.users.cache.size} user(s)`,
                `> - ${client.guilds.cache.size} guild(s)`,
                `> - ${client.channels.cache.size} channel(s)`,
                `> - ping ${client.ws.ping}ms`,
            ].join('\n'));

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: `Hello world, I\'m ${discord_client.user.username}`,
                    description: [
                        `I was created by <@${bot_application_owner_id}> <t:${bot_creation_unix_epoch}:R> on <t:${bot_creation_unix_epoch}:D>.`,
                    ].join('\n'),
                    fields: [
                        {
                            name: 'About Me',
                            value: `${bot_application.description}`,
                        }, {
                            name: 'Sharding Information',
                            value: [
                                distributed_bot_sharding_info.join('\n\n'),
                            ].join('\n'),
                        },
                    ],
                }),
            ],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Invite Me',
                            url: `${bot_invite_url}`,
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Support Server',
                            url: 'https://discord.gg/BXJpS6g',
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Website',
                            url: 'https://iris-utilities.com/',
                        },
                    ],
                }, {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Donate',
                            url: 'https://github.com/sponsors/MidSpike',
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Source Code',
                            url: 'https://github.com/MidSpike/iris-utilities',
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Privacy Policy',
                            url: 'https://iris-utilities.com/pages/privacy.html',
                        },
                    ],
                },
            ],
        });
    },
});
