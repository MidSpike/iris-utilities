'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'test',
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
                    description: `${interaction.user}, running test...`,
                }),
            ],
        }).catch(() => {});

        await interaction.followUp({
            content: `${interaction.member}, did the test!`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 1,
                            custom_id: 'test_button',
                            label: 'Test Button',
                        },
                    ],
                },
            ],
        }).catch(console.warn);

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, completed the programmed test!`,
                }),
            ],
        }).catch(() => {});
    },
});
