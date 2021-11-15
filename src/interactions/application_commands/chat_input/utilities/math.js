'use strict';

//------------------------------------------------------------//

const MathJS = require('mathjs');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
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

        await interaction.deferReply();

        const math_expression = interaction.options.getString('expression', true);

        try {
            const evaluated_math = MathJS.evaluate(math_expression);

            interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        title: 'Math Expression Output',
                        description: `I crunched the numbers, this is what I found!`,
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
            }).catch(console.warn);
        } catch {
            interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        title: 'Math Expression Output',
                        description: `Something went wrong, I couldn't evaluate that math expression!`,
                    }),
                ],
            }).catch(console.warn);
        }
    },
});
