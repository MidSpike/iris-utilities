'use strict';

//------------------------------------------------------------//

const axios = require('axios');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
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

        await axios({
            method: 'post',
            url: `https://discord.com/api/v8/interactions/${interaction.id}/${interaction.token}/callback`,
            data: {
                type: 9,
                data: {
                    custom_id: 'test_modal',
                    title: 'Test Modal',
                    components: [
                        {
                            type: 1,
                            components: [
                                {
                                    type: 4,
                                    custom_id: 'test_text_input',
                                    style: 1,
                                    label: 'Test Text Input',
                                },
                            ],
                        },
                    ],
                },
            },
        }).catch(console.warn);
    },
});
