//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as fs from 'node:fs';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import { delay, randomItemFromArray } from '@root/common/lib/utilities';

import { CustomEmbed, disableMessageComponents, requestPotentialNotSafeForWorkContentConsent } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const cah_card_set: {
    id: number,
    cardType: 'Q' | 'A',
    text: string,
    numAnswers: number,
    expansion: string,
}[] = JSON.parse(
    fs.readFileSync(
        path.join(process.cwd(), 'misc', 'cards_against_humanity.json'),
        {
            encoding: 'utf8',
        }
    )
);

const black_cards = cah_card_set.filter(card => card.cardType === 'Q');
const white_cards = cah_card_set.filter(card => card.cardType === 'A');

//------------------------------------------------------------//

async function updateMessageWithNewContent(discord_client: Discord.Client<true>, message: Discord.Message) {
    const selected_black_card = randomItemFromArray(black_cards.filter(card => card.numAnswers === 2));
    const selected_white_cards = Array.from({ length: selected_black_card.numAnswers }, () => randomItemFromArray(white_cards));

    await delay(250); // prevent api abuse

    await message.edit({
        embeds: [
            CustomEmbed.from({
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
                    text: 'Inspired by Cards Against Humanity',
                },
            }),
        ],
    });
}

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'cards',
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

        const user_consents_to_potential_nsfw = await requestPotentialNotSafeForWorkContentConsent(interaction.channel, interaction.user);
        if (!user_consents_to_potential_nsfw) return await interaction.deleteReply();

        const bot_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Loading...',
                }),
            ],
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'generate_new_cah_card',
                            label: 'Generate New Card',
                        },
                    ],
                },
            ],
        });

        if (!(bot_message instanceof Discord.Message)) return;

        await updateMessageWithNewContent(discord_client, bot_message);

        const button_interaction_collector = bot_message.createMessageComponentCollector({
            time: 2 * 60_000, // 2 minutes
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
