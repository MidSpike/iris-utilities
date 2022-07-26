//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

async function createHelpEmbed(command_category_id: string) {
    const command_category = ClientCommandHelper.categories[command_category_id];
    if (!command_category) throw new Error(`No command category exists with id: ${command_category_id};`);

    const chat_input_commands = ClientInteractionManager.interactions.filter(interaction => interaction.data.type === Discord.ApplicationCommandType.ChatInput);

    const commands_in_specified_category = chat_input_commands.filter(client_interaction => client_interaction.metadata.command_category!.id === command_category.id);
    const mapped_commands_in_specified_category = commands_in_specified_category.map(client_interaction => {
        const filtered_client_interactions = (client_interaction.data as Discord.ChatInputApplicationCommandData).options!.filter(option => ![
            Discord.ApplicationCommandOptionType.SubcommandGroup,
            Discord.ApplicationCommandOptionType.Subcommand,
        ].includes(option.type as number)) as (Discord.ApplicationCommandOption & { required?: boolean })[];

        const command_usage = filtered_client_interactions.map(({ required, name, type }) =>
            `${required ? '<' : '['}${name}${required ? '>' : ']'}`
            // `${required ? '<' : '['}${name}: ${type}${required ? '>' : ']'}`;
        ).join(' ');
        return `/${client_interaction.identifier} ${command_usage}`;
    });

    return CustomEmbed.from({
        title: `${command_category.name}`,
        description: [
            '\`\`\`',
            mapped_commands_in_specified_category.length > 0 ? (
                `${mapped_commands_in_specified_category.join('\n')}`
            ) : (
                'Nothing to see here yet!'
            ),
            '\`\`\`',
        ].join('\n'),
    });
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
                choices: Object.values(ClientCommandHelper.categories).map(category => ({
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

        const bot_message = await interaction.editReply({
            content: `Hello there, I\'m ${discord_client.user!.username}!`,
            embeds: [
                await createHelpEmbed(interaction.options.getString('category', false) ?? 'HELP_AND_INFORMATION'),
            ],
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: 3,
                            customId: 'help_menu',
                            placeholder: 'Select a page!',
                            minValues: 1,
                            maxValues: 1,
                            options: Object.values(ClientCommandHelper.categories).map(({ id, name, description }) => ({
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
            componentType: Discord.ComponentType.SelectMenu,
            time: 5 * 60_000,
        });

        interaction_collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();

            switch (interaction.customId) {
                case 'help_menu': {
                    await interaction.editReply({
                        embeds: [
                            await createHelpEmbed(interaction.values[0]),
                        ],
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
            bot_message.delete();
        });
    },
});
