//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandCategoryId, ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

async function createHelpEmbeds(
    interaction: Discord.Interaction,
    command_category_id: ClientCommandCategoryId,
) {
    const command_category = ClientCommandHelper.categories[command_category_id];
    if (!command_category) throw new Error(`No command category exists with id: ${command_category_id};`);

    const chat_input_commands = ClientInteractionManager.interactions.filter(
        (interaction) => interaction.data.type === Discord.ApplicationCommandType.ChatInput
    );

    const commands_in_specified_category = chat_input_commands.filter(
        (client_interaction) => client_interaction.metadata.command_category!.id === command_category.id
    );

    const mapped_commands_in_specified_category = commands_in_specified_category.map(
        (client_interaction) => {
            const client_command_options = (client_interaction.data as Discord.ChatInputApplicationCommandData).options!;

            // remove subcommand groups and subcommands from the options
            const filtered_command_options = client_command_options.filter(
                (option) => ![
                    Discord.ApplicationCommandOptionType.SubcommandGroup,
                    Discord.ApplicationCommandOptionType.Subcommand,
                ].includes(option.type as number)
            ) as (Discord.ApplicationCommandOption & { required?: boolean })[];

            // generate the command usage string.
            // required options are surrounded by `<>`, optional options are surrounded by `[]`.
            // after 3 options, the remaining options will be replaced by an ellipsis.
            // example: `<option_1_required> [option_2_optional] [option_3_optional] ...`.
            let command_usage: string = '';

            for (let i = 0; i < filtered_command_options.length; i++) {
                const command_option = filtered_command_options[i];

                command_usage += `${command_option.required ? '<' : '['}${command_option.name}${command_option.required ? '>' : ']'} `;

                if (i === 2) { // 3rd option
                    command_usage += '...';

                    break;
                }
            }

            // example: `/lookup <query> [location] [ephemeral] ...`
            return `/${client_interaction.identifier} ${command_usage}`;
        }
    );

    const application_commands = await interaction.client.application?.commands.fetch({ force: true });
    const info_command_id = application_commands?.find((command) => command.name === 'info')!.id ?? '0';

    return [
        CustomEmbed.from({
            title: `Hello there, I\'m ${interaction.client.user!.username}!`,
            description: [
                'Below is a list of commands that you can use to interact with me.',
                `You can also use the </info:${info_command_id}> command for more information about me.`,
            ].join('\n'),
        }),
        CustomEmbed.from({
            title: `${command_category.name}`,
            description: [
                `${command_category.description}`,
                '\`\`\`',
                mapped_commands_in_specified_category.length > 0 ? (
                    `${mapped_commands_in_specified_category.join('\n')}`
                ) : (
                    'Nothing to see here yet!'
                ),
                '\`\`\`',
            ].join('\n'),
        }),
    ];
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'help',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays various information about the bot',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'category',
                description: 'the category to show',
                choices: Object.values(ClientCommandHelper.categories).map(
                    (category) => ({
                        name: category.name,
                        value: category.id,
                    })
                ),
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.HELP_AND_INFORMATION,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: true });

        const category_option_value = interaction.options.getString('category', false) as ClientCommandCategoryId | undefined;
        const help_category_id = category_option_value ?? 'HELP_AND_INFORMATION';

        const bot_message = await interaction.editReply({
            embeds: await createHelpEmbeds(interaction, help_category_id),
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.StringSelect,
                            customId: 'help_menu',
                            placeholder: 'Select a page!',
                            minValues: 1,
                            maxValues: 1,
                            options: Object.values(ClientCommandHelper.categories).map(
                                ({ id, name, description }) => ({
                                    label: name,
                                    description: description.slice(0, 100),
                                    value: id,
                                })
                            ),
                        },
                    ],
                },
            ],
        });

        const interaction_collector = await bot_message.createMessageComponentCollector({
            filter: (inter) => inter.user.id === interaction.user.id,
            componentType: Discord.ComponentType.StringSelect,
            time: 5 * 60_000, // 5 minutes
        });

        interaction_collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();

            switch (interaction.customId) {
                case 'help_menu': {
                    const help_category_id = interaction.values[0] as ClientCommandCategoryId;

                    await interaction.editReply({
                        embeds: await createHelpEmbeds(interaction, help_category_id),
                    });

                    break;
                }

                default: {
                    return;
                }
            }

            interaction_collector.resetTimer();
        });

        interaction_collector.on('end', async () => {
            await bot_message.edit({
                components: [],
            });
        });
    },
});
