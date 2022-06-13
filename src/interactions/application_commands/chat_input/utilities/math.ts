//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as MathJs from 'mathjs';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'math',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'expression',
                description: 'the math expression to evaluate',
                required: true,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const math_expression = interaction.options.getString('expression', true);

        let evaluated_math;
        try {
            evaluated_math = MathJs.evaluate(math_expression);
        } catch (error) {
            console.trace(error);

            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        title: 'Math Expression Output',
                        description: 'Something went wrong, I couldn\'t evaluate that math expression!',
                    }),
                ],
            });

            return;
        }

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: 'Math Expression Output',
                    description: 'I crunched the numbers, this is what I found!',
                    fields: [
                        {
                            name: 'Expression',
                            value: `\`\`\`\n${math_expression}\n\`\`\``,
                        }, {
                            name: 'Result',
                            value: `\`\`\`\n${evaluated_math}\n\`\`\``,
                        },
                    ],
                }),
            ],
        });
    },
});
