//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.UserApplicationCommandData>({
    identifier: 'Quick User Info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.User,
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.Anywhere,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
    },
    async handler(discord_client, interaction) {
        if (!interaction.isUserContextMenuCommand()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: true });

        const user = await interaction.client.users.fetch(interaction.targetUser, { force: true });

        const user_created_timestamp_epoch = `${user.createdTimestamp}`.slice(0, -3);

        const user_icon_url = user.displayAvatarURL({ forceStatic: false, size: 4096 });
        const user_banner_url = user.bannerURL({ forceStatic: false, size: 4096 });

        const user_flags = user.flags?.toArray() ?? [];

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Quick User Info',
                    fields: [
                        {
                            name: 'Username',
                            value: `\`\`\`\n${user.tag}\n\`\`\``,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `\`\`\`\n${user.id}\n\`\`\``,
                            inline: false,
                        },

                        {
                            name: 'Account Created On',
                            value: `<t:${user_created_timestamp_epoch}:F> (<t:${user_created_timestamp_epoch}:R>)`,
                            inline: false,
                        },

                        {
                            name: 'User Avatar',
                            value: `${user_icon_url ? `[Image](${user_icon_url})` : '\`n/a\`'}`,
                            inline: true,
                        }, {
                            name: 'User Banner',
                            value: `${user_banner_url ? `[Image](${user_banner_url})` : '\`n/a\`'}`,
                            inline: true,
                        }, {
                            name: 'Accent Color',
                            value: `\`${user.hexAccentColor ?? 'automatic'}\``,
                            inline: true,
                        },

                        {
                            name: 'System',
                            value: `\`${user.system ?? false}\``,
                            inline: true,
                        }, {
                            name: 'Bot',
                            value: `\`${user.bot ?? false}\``,
                            inline: true,
                        }, {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        },

                        {
                            name: 'Account Flags',
                            value: (user_flags.map((flag) => `- \`${flag}\``).join('\n') || '\`n/a\`'),
                            inline: false,
                        },
                    ],
                }),
            ],
        });
    },
});
