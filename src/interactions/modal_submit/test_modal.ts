'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'test_modal',
    type: Discord.InteractionType.MessageComponent,
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
    },
    async handler(discord_client, interaction) {
        if (!interaction.isModalSubmit()) return;

        await interaction.deferReply({ ephemeral: false });

        const text_input = interaction.fields.getTextInputValue('test_text_input');

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Woah modals are cool!',
                    description: `You typed: \`${text_input}\``,
                }),
            ],
        });
    },
});
