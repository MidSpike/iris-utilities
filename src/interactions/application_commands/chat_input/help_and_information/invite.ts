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
    identifier: 'invite',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'sends an invite link for the bot',
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

        await interaction.deferReply({ ephemeral: true });

        const bot_invite_url = discord_client.generateInvite({
            scopes: [
                Discord.OAuth2Scopes.Bot,
                Discord.OAuth2Scopes.ApplicationsCommands,
            ],
            permissions: [
                Discord.PermissionFlagsBits.Administrator,
            ],
        });

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: 'Hello there!',
                    description: [
                        'You can invite me to another server by using the button below!',
                    ].join('\n'),
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
                        },
                    ],
                },
            ],
        });
    },
});
