'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '../../../../common/app/client_interactions';

import { delay } from '../../../../common/lib/utilities';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'register_commands',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        description: 'n/a',
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.BOT_SUPER,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('BOT_SUPER'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.reply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, registering global commands...`,
                }),
            ],
        }).catch(() => {});

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
            if (client_interaction.type !== Discord.Constants.InteractionTypes.APPLICATION_COMMAND) continue;

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
