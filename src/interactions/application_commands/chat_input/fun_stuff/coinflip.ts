'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { delay } from '../../../../common/lib/utilities';

import { CustomEmbed, disableMessageComponents } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

async function generateMessagePayload(interaction_author: Discord.User) {
    const coin_facing = Math.random() > 0.5 ? 'heads' : 'tails';

    return {
        embeds: [
            CustomEmbed.from({
                description: [
                    `${interaction_author}, flipped a coin;`,
                    `and it landed on **${coin_facing}**!`,
                ].join('\n'),
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

export default new ClientInteraction({
    identifier: 'coinflip',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'n/a',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.get('FUN_STUFF'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const bot_message = await interaction.editReply(await generateMessagePayload(interaction.user));

        if (!(bot_message instanceof Discord.Message)) return;

        const button_interaction_collector = bot_message.createMessageComponentCollector({
            time: 1 * 60_000, // 1 minute
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            switch (button_interaction.customId) {
                case 'flip_coin_button': {
                    if (!(button_interaction.message instanceof Discord.Message)) return;

                    await disableMessageComponents(button_interaction.message);

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, flipping a coin...`,
                            }),
                        ],
                    });

                    await delay(1000);

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
