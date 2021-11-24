'use strict';

//------------------------------------------------------------//

const translateUsingGoogle = require('translate-google');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'Translate To English',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.MESSAGE,
        description: '', // required for the command to be registered
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
    },
    async handler(discord_client, interaction) {
        if (!interaction.isContextMenu()) return;

        /** @type {Discord.Message} */
        const message = interaction.options.resolved.messages.first();

        const query = message.cleanContent;

        if (!query.length) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, you can only use this command on messages that have content.`,
                    }),
                ],
            });
        }

        /** @type {string} */
        const translated_query = await translateUsingGoogle(query, { to: 'en' });

        await interaction.followUp({
            embeds: [
                new CustomEmbed({
                    title: 'Translation To English',
                    description: [
                        `${interaction.user}, here is the english translation of that message:`,
                        '\`\`\`',
                        translated_query,
                        '\`\`\`',
                    ].join('\n'),
                }),
            ],
        });
    },
});
