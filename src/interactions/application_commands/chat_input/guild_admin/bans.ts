//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberPossessPermissionFlagBit } from '@root/common/app/permissions';

//------------------------------------------------------------//

async function generatePaginator(
    interaction: Discord.ChatInputCommandInteraction<'cached'>,
    before_id?: string,
    after_id?: string,
): Promise<{
    first_ban_id: string | undefined;
    last_ban_id: string | undefined;
    message_payload: Discord.WebhookEditMessageOptions;
}> {
    const guild_bans = await interaction.guild.bans.fetch({
        before: before_id,
        after: after_id,
        limit: 5,
    });

    return {
        first_ban_id: guild_bans.at(0)?.user.id,
        last_ban_id: guild_bans.at(-1)?.user.id,
        message_payload: {
            embeds: [
                CustomEmbed.from({
                    title: 'Guild Bans',
                    description: [
                        `${interaction.user}, displaying up to 5 bans per page.`,
                        'The guild bans are sorted by most recent to oldest.',
                    ].join('\n'),
                    fields: guild_bans.map(ban => ({
                        name: 'Ban Record',
                        value: [
                            '\`\`\`',
                            `User: @${ban.user.tag} (${ban.user.id})`,
                            `Reason: ${Discord.escapeMarkdown(ban.reason || 'No reason provided.')}`,
                            '\`\`\`',
                        ].join('\n'),
                    })),
                }),
            ],
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'bans_command_buttons__previous',
                            label: 'Previous',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'bans_command_buttons__next',
                            label: 'Next',
                        },
                    ],
                },
            ],
        },
    };
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'bans',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays all bans in the guild',
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.GUILD_ADMIN,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.BanMembers,
        ],
        command_category: ClientCommandHelper.categories.GUILD_ADMIN,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: true });

        const is_user_allowed_to_view_bans = await doesMemberPossessPermissionFlagBit(interaction.member, Discord.PermissionFlagsBits.BanMembers);
        if (!is_user_allowed_to_view_bans) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, you do not have permission to view bans.`,
                    }),
                ],
            });

            return;
        }

        const bot_initial_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, fetching bans...`,
                }),
            ],
        });

        let active_paginator = await generatePaginator(interaction);
        await interaction.editReply(active_paginator.message_payload);

        const button_interaction_collector = bot_initial_message.createMessageComponentCollector({
            time: 5 * 60_000, // 5 minutes
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            if (!button_interaction.inCachedGuild()) return;

            await button_interaction.deferUpdate();

            if (button_interaction.user.id !== interaction.user.id) return; // only allow the user to interact with the buttons

            switch (button_interaction.customId) {
                case 'bans_command_buttons__previous': {
                    const previous_paginator = await generatePaginator(interaction, active_paginator.first_ban_id, undefined);

                    if (
                        !active_paginator.first_ban_id ||
                        !previous_paginator.first_ban_id ||
                        previous_paginator.first_ban_id === active_paginator.first_ban_id
                    ) return;

                    // eslint-disable-next-line require-atomic-updates
                    active_paginator = previous_paginator;

                    await button_interaction.editReply(previous_paginator.message_payload);

                    break;
                }

                case 'bans_command_buttons__next': {
                    const previous_paginator = await generatePaginator(interaction, undefined, active_paginator.last_ban_id);

                    if (
                        !active_paginator.last_ban_id ||
                        !previous_paginator.last_ban_id ||
                        previous_paginator.last_ban_id === active_paginator.last_ban_id
                    ) return;

                    // eslint-disable-next-line require-atomic-updates
                    active_paginator = previous_paginator;

                    await button_interaction.editReply(previous_paginator.message_payload);

                    break;
                }

                default: {
                    return;
                }
            }

            button_interaction_collector.resetTimer();
        });

        button_interaction_collector.on('end', async (collected_interactions, reason) => {
            const most_recent_interaction = collected_interactions.last();

            if (!most_recent_interaction) return;
            if (!most_recent_interaction.inCachedGuild()) return;

            await disableMessageComponents(most_recent_interaction.message);
        });
    },
});
