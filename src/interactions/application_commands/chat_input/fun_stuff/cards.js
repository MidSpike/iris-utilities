'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { delay, array_random } = require('../../../../common/lib/utilities')

const { CustomEmbed, disableMessageComponents, requestPotentialNotSafeForWorkContentConsent } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

const cah_card_set = require('../../../../misc/cards_against_humanity.json');
const black_cards = cah_card_set.filter(card => card.cardType === 'Q');
const white_cards = cah_card_set.filter(card => card.cardType === 'A');

//------------------------------------------------------------//

async function updateMessageWithNewContent(discord_client, message) {
    const selected_black_card = array_random(black_cards.filter(card => card.numAnswers === 2));
    const selected_white_cards = Array.from({ length: selected_black_card.numAnswers }, () => array_random(white_cards));

    await delay(250); // prevent api abuse

    await message.edit({
        embeds: [
            new CustomEmbed({
                title: `Cards Against ${discord_client.user.username}`,
                fields: [
                    {
                        name: 'Black Card',
                        value: `${'```'}\n${selected_black_card.text.replace(/([_]+)/gi, '_____')}\n${'```'}`,
                        inline: false,
                    },
                    ...selected_white_cards.map(white_card => ({
                        name: 'White Card',
                        value: `${'```'}\n${white_card.text}\n${'```'}`,
                        inline: true,
                    })),
                ],
                footer: {
                    text: `Inspired by Cards Against Humanity`,
                },
            }),
        ],
    });
}

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'cards',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        description: 'n/a',
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('FUN_STUFF'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const user_consents_to_potential_nsfw = await requestPotentialNotSafeForWorkContentConsent(interaction.channel, interaction.user);
        if (!user_consents_to_potential_nsfw) return;

        /** @type {Discord.Message} */
        const bot_message = await interaction.followUp({
            embeds: [
                new CustomEmbed({
                    title: 'Loading...',
                }),
            ],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'generate_new_cah_card',
                            label: 'Generate New Card',
                        },
                    ],
                },
            ],
        });

        await updateMessageWithNewContent(discord_client, bot_message);

        const button_interaction_collector = await bot_message.createMessageComponentCollector({
            filter: (button_interaction) => true,
            time: 0.5 * 60_000,
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            switch (button_interaction.customId) {
                case 'generate_new_cah_card': {
                    await updateMessageWithNewContent(discord_client, bot_message);

                    break;
                }
                default: {
                    return; // don't continue without a valid custom id
                }
            }

            button_interaction_collector.resetTimer();
        });

        button_interaction_collector.on('end', async () => {
            await disableMessageComponents(bot_message);
        });
    },
});
