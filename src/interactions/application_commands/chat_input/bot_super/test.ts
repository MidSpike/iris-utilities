//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed, CustomEmoji } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'test',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'n/a',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.BOT_SUPER,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
        ],
        command_category: ClientCommandHelper.categories.get('BOT_SUPER'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        console.log('test', CustomEmoji.identifiers.SEVEN);

        await interaction.reply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, running test...`,
                }),
            ],
        }).catch(() => {});

        // await interaction.followUp({
        //     content: `${interaction.member}, did the test!`,
        //     components: [
        //         {
        //             type: Discord.ComponentType.ActionRow,
        //             components: [
        //                 {
        //                     type: Discord.ComponentType.Button,
        //                     style: Discord.ButtonStyle.Primary,
        //                     customId: 'test_button',
        //                     label: 'Test Button',
        //                 },
        //             ],
        //         },
        //     ],
        // }).catch(console.warn);
    },
});
