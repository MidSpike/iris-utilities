//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<never>({
    identifier: 'test_button',
    type: Discord.InteractionType.MessageComponent,
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
    },
    async handler(discord_client, interaction) {
        if (!interaction.isButton()) return;

        await disableMessageComponents(interaction.message);

        await interaction.showModal(
            new Discord.ModalBuilder()
                .setCustomId('test_modal')
                .setTitle('Test Modal')
                .setComponents([
                    new Discord.ActionRowBuilder<Discord.ModalActionRowComponentBuilder>()
                        .setComponents([
                            new Discord.TextInputBuilder()
                                .setStyle(Discord.TextInputStyle.Paragraph)
                                .setCustomId('test_text_input')
                                .setLabel('Type something below!')
                                .setRequired(true),
                        ]),
                ])
        ).catch(console.error);

        await interaction.awaitModalSubmit({
            filter: (modal) => modal.customId === 'test_modal',
            time: 5 * 60_000,
        }).then(async (modal_submit_interaction) => {
            if (!modal_submit_interaction.isFromMessage()) return;

            await modal_submit_interaction.deferReply();

            const text_input = modal_submit_interaction.fields.getTextInputValue('test_text_input');

            await modal_submit_interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        title: 'Woah modals are cool!',
                        description: [
                            'You typed:',
                            '\`\`\`',
                            text_input,
                            '\`\`\`',
                        ].join('\n'),
                    }),
                ],
            });
        });
    },
});
