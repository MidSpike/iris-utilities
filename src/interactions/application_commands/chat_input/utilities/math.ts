'use strict';

//------------------------------------------------------------//

import * as MathJs from 'mathjs';

import Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientInteraction, ClientCommandHelper } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'math',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
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
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

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
