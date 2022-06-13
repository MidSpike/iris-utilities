//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '@root/common/app/client_interactions';

import { delay } from '@root/common/lib/utilities';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'publish_commands',
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
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.get('BOT_SUPER'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.reply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, publishing global commands to Discord...`,
                }),
            ],
        }).catch(() => {});

        /* remove non-existent commands */
        for (const [ application_command_id, application_command ] of await discord_client.application.commands.fetch()) {
            const command_exists = ClientInteractionManager.interactions.find(interaction => interaction.identifier === application_command.name);

            if (!command_exists) {
                console.info(`<DC A - ${discord_client.user.username}> removing non-existent global command: ${application_command.name};`);
                await discord_client.application.commands.delete(application_command_id);
            }

            await delay(100); // prevent api abuse
        }

        /* register all commands */
        const commands_to_register: Discord.ApplicationCommandDataResolvable[] = [];
        for (const client_interaction of ClientInteractionManager.interactions.values()) {
            if (client_interaction.type !== Discord.InteractionType.ApplicationCommand) continue;

            console.info(`<DC A - ${discord_client.user.username}> preparing to register global command: ${client_interaction.identifier};`);

            commands_to_register.push(client_interaction.data as Discord.ApplicationCommandDataResolvable);
        }

        try {
            console.info(`<DC A - ${discord_client.user.username}> registering ${commands_to_register.length} global commands...`);
            await discord_client.application.commands.set(commands_to_register);
        } catch (error) {
            console.trace(error);

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, failed to publish global commands to Discord.`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.GREEN,
                    description: `${interaction.user}, published ${commands_to_register.length} global commands to Discord.`,
                }),
            ],
        }).catch(() => {});
    },
});
