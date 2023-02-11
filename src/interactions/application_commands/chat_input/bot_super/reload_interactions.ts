//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { promisify } from 'node:util';

import { exec as runShellCommandSync } from 'node:child_process';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction, ClientInteractionManager } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const runShellCommand = promisify(runShellCommandSync);

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'reload_interactions',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'reserved for authorized staff of this bot',
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
        command_category: ClientCommandHelper.categories.BOT_SUPER,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.reply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, reloading all interactions...`,
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
                        description: `${interaction.user}, failed to build interactions.`,
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
                    description: `${interaction.user}, reloaded all interactions.`,
                }),
            ],
        }).catch(() => {});
    },
});
