'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { ClientCommandHelper, ClientInteraction } from '../../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'test_button',
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
        if (!interaction.isButton()) return;

        await interaction.showModal({
            customId: 'test_modal',
            title: 'Test Modal',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            style: 2,
                            customId: 'test_text_input',
                            label: 'Type something below!',
                            required: true,
                        },
                    ],
                },
            ],
        }).catch(console.error);
    },
});
