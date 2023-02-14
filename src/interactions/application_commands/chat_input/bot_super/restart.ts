//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { DiscordClientWithSharding } from '@root/types';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'restart',
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
        ],
        command_category: ClientCommandHelper.categories.BOT_SUPER,
    },
    async handler(
        discord_client: DiscordClientWithSharding,
        interaction
    ) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.reply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, restarting ${discord_client.shard.count} shard(s)...`,
                }),
            ],
        }).catch(() => {});

        await discord_client.shard.respawnAll({
            timeout: 60_000,
            shardDelay: 60_000,
            respawnDelay: 10_000,
        });
    },
});
