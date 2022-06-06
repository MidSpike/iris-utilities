'use strict';

//------------------------------------------------------------//

import { promisify } from 'node:util';

import { exec as runShellCommandSync } from 'node:child_process';

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '../../../../common/app/client_interactions';

import { delay } from '../../../../common/lib/utilities';

//------------------------------------------------------------//

const runShellCommand = promisify(runShellCommandSync);

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'register_commands',
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
                    description: `${interaction.user}, registering global commands...`,
                }),
            ],
        }).catch(() => {});

        /** re-build project */
        let build_result: { stdout: string; stderr: string } | undefined;
        try {
            build_result = await runShellCommand('npm run build');
        } catch (error) {
            console.trace({ error, build_result });

            await interaction.reply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, failed to build project`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        /* re-register all interaction files */
        await ClientInteractionManager.registerClientInteractions(discord_client);

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
        }

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, registered ${commands_to_register.length} global commands!`,
                }),
            ],
        }).catch(() => {});
    },
});
