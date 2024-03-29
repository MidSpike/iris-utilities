//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '@root/common/app/client_interactions';

import { delay } from '@root/common/lib/utilities';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'publish_interactions',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'reserved for authorized staff of this bot',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.BotSuper,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.BOT_SUPER,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.reply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, publishing global interactions to Discord...`,
                }),
            ],
        }).catch(() => {});

        /* remove non-existent interactions */
        for (const [ application_command_id, application_command ] of await discord_client.application.commands.fetch()) {
            const command_exists = ClientInteractionManager.interactions.find((interaction) => interaction.identifier === application_command.name);

            if (!command_exists) {
                console.info(`<DC A - ${discord_client.user.username}> removing non-existent global interactions: ${application_command.name};`);
                await discord_client.application.commands.delete(application_command_id);
            }

            await delay(100); // prevent api abuse
        }

        /* register all commands */
        const commands_to_register: Discord.ApplicationCommandDataResolvable[] = [];
        for (const client_interaction of ClientInteractionManager.interactions.values()) {
            if (client_interaction.type !== Discord.InteractionType.ApplicationCommand) continue;

            console.info(`<DC A - ${discord_client.user.username}> preparing to register global interaction: ${client_interaction.identifier};`);

            commands_to_register.push(client_interaction.data as Discord.ApplicationCommandDataResolvable);
        }

        try {
            console.info(`<DC A - ${discord_client.user.username}> registering ${commands_to_register.length} global interactions...`);
            await discord_client.application.commands.set(commands_to_register);
        } catch (error) {
            console.trace(error);

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, failed to publish global interactions to Discord.`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.user}, published ${commands_to_register.length} global interactions to Discord.`,
                }),
            ],
        }).catch(() => {});
    },
});
