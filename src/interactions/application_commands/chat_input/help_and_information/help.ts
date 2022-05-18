'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

async function createHelpEmbed(command_category_id: string) {
    const command_category = ClientCommandHelper.categories.get(command_category_id);
    if (!command_category) throw new Error(`No command category with id ${command_category_id}`);

    const chat_input_commands = ClientInteractionManager.interactions.filter(interaction => interaction.data.type === Discord.Constants.ApplicationCommandTypes.CHAT_INPUT);

    const commands_in_specified_category = chat_input_commands.filter(client_interaction => client_interaction.metadata.command_category!.id === command_category.id);
    const mapped_commands_in_specified_category = commands_in_specified_category.map(client_interaction => {
        const filtered_client_interactions = client_interaction.data.options!.filter(option => ![
            Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
            Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
        ].includes(option.type as number)) as (Discord.ApplicationCommandOption & { required?: boolean })[];

        const command_usage = filtered_client_interactions.map(({ required, name, type }) =>
            `${required ? '<' : '['}${name}${required ? '>' : ']'}`
            // `${required ? '<' : '['}${name}: ${type}${required ? '>' : ']'}`;
        ).join(' ');
        return `/${client_interaction.identifier} ${command_usage}`;
    });

    console.log({
        chat_input_commands,
        commands_in_specified_category,
    });

    return CustomEmbed.from({
        title: `${command_category.name}`,
        description: [
            '\`\`\`',
            mapped_commands_in_specified_category.length > 0 ? (
                `${mapped_commands_in_specified_category.join('\n')}`
            ) : (
                'Nothing to see here!'
            ),
            '\`\`\`',
        ].join('\n'),
    });
}

//------------------------------------------------------------//

module.exports.default = new ClientInteraction({
    identifier: 'help',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'displays various information about the bot',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'category',
                description: 'the category to show',
                choices: ClientCommandHelper.categories.map(category => ({
                    name: category.name,
                    value: category.id,
                })),
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('HELP_AND_INFORMATION'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const bot_message = await interaction.editReply({
            content: `Hello there, I\'m ${discord_client.user!.username}!`,
            embeds: [
                await createHelpEmbed(interaction.options.getString('category') ?? 'HELP_AND_INFORMATION'),
            ],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: 'help_menu',
                            placeholder: 'Select a page!',
                            min_values: 1,
                            max_values: 1,
                            options: ClientCommandHelper.categories.map(({ id, name, description }) => ({
                                label: name,
                                description: description.slice(0, 100),
                                value: id,
                            })),
                        },
                    ],
                },
            ],
        });

        if (!(bot_message instanceof Discord.Message)) return;

        const interaction_collector = await bot_message.createMessageComponentCollector({
            filter: (inter) => inter.user.id === interaction.user.id,
            time: 5 * 60_000,
        });

        interaction_collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();

            if (!interaction.isSelectMenu()) return;

            switch (interaction.customId) {
                case 'help_menu': {
                    console.log(interaction.values);
                    await interaction.editReply({
                        embeds: [
                            await createHelpEmbed(interaction.values[0]),
                        ],
                    });
                    break;
                }

                default: {
                    break;
                }
            }
        });

        interaction_collector.on('end', async () => {
            bot_message.delete();
        });
    },
});
