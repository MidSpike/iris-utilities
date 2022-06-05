'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { ClientCommandHelper, ClientInteraction } from '../../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'test_button',
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
        if (!interaction.isButton()) return;

        await interaction.showModal({
            custom_id: 'test_modal',
            title: 'Test Modal',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            style: 2,
                            custom_id: 'test_text_input',
                            label: 'Type something below!',
                            required: true,
                        },
                    ],
                },
            ],
        }).catch(console.error);
    },
});
