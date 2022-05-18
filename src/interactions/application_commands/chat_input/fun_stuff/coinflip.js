'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { delay } = require('../../../../common/lib/utilities');

const { CustomEmbed, disableMessageComponents } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

async function generateMessagePayload(interaction_author) {
    const coin_facing = Math.random() > 0.5 ? 'heads' : 'tails';

    return {
        embeds: [
            CustomEmbed.from({
                description: `${interaction_author}, flipped a coin and it landed on **${coin_facing}**!`,
                thumbnail: {
                    url: `https://cdn.midspike.com/projects/iris/Coin-${coin_facing === 'heads' ? 'H' : 'T'}_2020-09-18_b0.png`,
                },
            }),
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 2,
                        custom_id: 'flip_coin_button',
                        label: 'Flip Another Coin',
                    },
                ],
            },
        ],
    };
}

//------------------------------------------------------------//

module.exports.default = new ClientInteraction({
    identifier: 'coinflip',
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

        /** @type {Discord.Message} */
        const bot_message = await interaction.editReply(await generateMessagePayload(interaction.user));

        const button_interaction_collector = bot_message.createMessageComponentCollector({
            time: 1 * 60_000, // 1 minute
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            switch (button_interaction.customId) {
                case 'flip_coin_button': {
                    await disableMessageComponents(button_interaction.message);

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, flipping a coin...`,
                            }),
                        ],
                    });

                    await delay(1500);

                    await button_interaction.editReply(await generateMessagePayload(button_interaction.user));

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
