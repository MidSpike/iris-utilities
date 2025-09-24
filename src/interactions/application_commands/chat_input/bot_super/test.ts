//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { delay } from '@root/common/lib/utilities';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'test',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'reserved for authorized staff of this bot',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.BotSuper,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
        ],
        command_category: ClientCommandHelper.categories.BOT_SUPER,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply();

        await delay(1000);

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.member}, did the test!`,
                }),
            ],
            // components: [
            //     {
            //         type: Discord.ComponentType.ActionRow,
            //         components: [
            //             {
            //                 type: Discord.ComponentType.Button,
            //                 style: Discord.ButtonStyle.Primary,
            //                 customId: 'test_button',
            //                 label: 'Test Button',
            //             },
            //         ],
            //     },
            // ],
        }).catch(console.warn);
    },
});
