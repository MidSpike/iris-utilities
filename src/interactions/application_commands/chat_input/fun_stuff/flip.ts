//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { delay } from '@root/common/lib/utilities';

import { CustomEmbed, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const flip_coin_button = new Discord.ButtonBuilder()
    .setStyle(Discord.ButtonStyle.Secondary)
    .setCustomId('flip_coin_button')
    .setLabel('Flip Another Coin')
    .setDisabled(false);

//------------------------------------------------------------//

async function generateMessagePayload(interaction_author: Discord.User): Promise<Discord.BaseMessageOptions> {
    const coin_facing: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails';

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
                type: Discord.ComponentType.ActionRow,
                components: [
                    Discord.ButtonBuilder.from(flip_coin_button),
                ],
            },
        ],
    };
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'flip',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'flips a 2 sided coin',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.FUN_STUFF,
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
            if (!button_interaction.inCachedGuild()) return;

            await button_interaction.deferUpdate();

            switch (button_interaction.customId) {
                case 'flip_coin_button': {
                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${interaction.user}, flipping a coin...`,
                            }),
                        ],
                        components: [
                            {
                                type: Discord.ComponentType.ActionRow,
                                components: [
                                    Discord.ButtonBuilder.from(flip_coin_button).setDisabled(true),
                                ],
                            },
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
