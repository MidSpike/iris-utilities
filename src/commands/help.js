'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientCommand, ClientCommandManager, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

async function createHelpEmbed(command_category_id) {
    const command_category = ClientCommand.categories.get(command_category_id);
    if (!command_category) throw new Error(`No command category with id ${command_category_id}`);

    const all_commands = ClientCommandManager.commands;

    const commands_in_specified_category = all_commands.filter(command => command.category.id === command_category.id);
    const mapped_commands_in_specified_category = commands_in_specified_category.map(command => {
        const command_usage = command.options.map(({ required, name, type }) => {
            return `${required ? '<' : '['}${name}: ${type}${required ? '>' : ']'}`;
        }).join(' ');
        return `/${command.name} ${command_usage}`;
    });

    return {
        color: 0xFF5500,
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
    };
}

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'help',
    description: 'displays a list of commands',
    category: ClientCommand.categories.get('HELP_AND_INFORMATION'),
    options: [
        {
            type: 'STRING',
            name: 'category',
            description: 'the category to show',
            choices: ClientCommand.categories.map(category => ({
                name: category.name,
                value: category.id,
            })),
            required: false,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        /** @type {Discord.Message} */
        const bot_message = await command_interaction.reply({
            fetchReply: true,
            content: `Hello there, I\'m ${discord_client.user.username}!`,
            embeds: [
                await createHelpEmbed(command_interaction.options.get('category')?.value ?? 'HELP_AND_INFORMATION'),
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
                            options: ClientCommand.categories.map(({ id, name, description }) => ({
                                label: name,
                                description: description.slice(0, 50),
                                value: id,
                            })),
                        },
                    ],
                },
            ],
        });

        const interaction_collector = await bot_message.createMessageComponentCollector({
            filter: (interaction) => interaction.user.id === command_interaction.user.id,
        });

        interaction_collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();

            console.log({
                interaction,
            });

            switch (interaction.customId) {
                case 'help_menu': {
                    console.log(interaction.values);
                    await interaction.editReply({
                        embeds: [
                            await createHelpEmbed(interaction.values[0])
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
