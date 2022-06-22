//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { inclusiveRange, randomNumberFromInclusiveRange } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

function rollDice(
    number_of_dice: number = 1,
    number_of_sides: number = 6
) {
    const rolled_dice: number[] = [];

    for (const _ of inclusiveRange(1, number_of_dice)) {
        rolled_dice.push(
            randomNumberFromInclusiveRange(1, number_of_sides)
        );
    }

    return rolled_dice;
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'rolldice',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'n/a',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'amount',
                description: 'the amount of dice to roll',
                required: false,
                minValue: 1,
                maxValue: 100,
            }, {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'sides',
                description: 'the number of sides on the dice',
                required: false,
                minValue: 1,
                maxValue: 100,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
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

        const amount_of_dice = interaction.options.getInteger('amount', false) ?? 1;
        const number_of_sides = interaction.options.getInteger('sides', false) ?? 6;

        const rolled_dice = rollDice(amount_of_dice, number_of_sides);
        const combined_dice_value = rolled_dice.reduce((a, b) => a + b, 0);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: `Rolled ${amount_of_dice}, ${number_of_sides ?? 6}-sided dice!`,
                    description: amount_of_dice === 1 ? (
                        `You rolled ${combined_dice_value}`
                    ) : (
                        `You rolled \`${rolled_dice.join(' + ')}\` = ${combined_dice_value}`
                    ),
                }),
            ],
        });
    },
});
