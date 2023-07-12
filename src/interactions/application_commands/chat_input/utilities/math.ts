//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

// @ts-expect-error, we can safely ignore the error thrown by typescript here.
//
// > The current file is a CommonJS module whose imports will produce 'require' calls;
// > however, the referenced file is an ECMAScript module and cannot be imported with 'require'."
//
// mathjs does actually export as commonjs, but typescript seems to think it doesn't.
import * as MathJs from 'mathjs';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'math',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'evaluate',
                description: 'Evaluates a mathematical expression.',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'expression',
                        description: 'the math expression to evaluate',
                        required: true,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'evaluate_live',
                description: 'Evaluates a mathematical expression.',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'expression',
                        description: 'the math expression to evaluate',
                        autocomplete: true,
                        required: true,
                    },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.UTILITIES,
    },
    async handler(discord_client, interaction) {
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const autocomplete_expression = interaction.options.getFocused();

            let evaluated_math;
            try {
                evaluated_math = MathJs.evaluate(autocomplete_expression);
            } catch (error) {
                evaluated_math = 'Failed to evaluate expression.';
            }

            await interaction.respond([
                {
                    name: `${autocomplete_expression} = ${evaluated_math}`,
                    value: `${evaluated_math}`,
                },
            ]);

            return;
        }

        if (!interaction.isChatInputCommand()) return;

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
