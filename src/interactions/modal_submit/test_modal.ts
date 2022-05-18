'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { CustomEmbed } from '../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'test_modal',
    type: Discord.Constants.InteractionTypes.MESSAGE_COMPONENT,
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
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
