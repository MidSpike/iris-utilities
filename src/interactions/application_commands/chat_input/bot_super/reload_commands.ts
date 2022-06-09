'use strict';

//------------------------------------------------------------//

import { promisify } from 'node:util';

import { exec as runShellCommandSync } from 'node:child_process';

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

const runShellCommand = promisify(runShellCommandSync);

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'reload_commands',
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
                    description: `${interaction.user}, reloading all commands...`,
                }),
            ],
        }).catch(() => {});

        /** re-build project */
        let build_result: { stdout: string; stderr: string } | undefined;
        try {
            build_result = await runShellCommand('npm run build');
        } catch (error) {
            console.trace({ error, build_result });

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, failed to build project.`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        /* re-register all interaction files */
        await ClientInteractionManager.registerClientInteractions(discord_client);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.GREEN,
                    description: `${interaction.user}, reloaded all commands.`,
                }),
            ],
        }).catch(() => {});
    },
});
