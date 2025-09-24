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
    identifier: 'roll',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'rolls a specified amount of dice with a specified number of sides',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'amount',
                description: 'the amount of dice to roll',
                required: false,
                minValue: 1,
                maxValue: 1024,
            }, {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'sides',
                description: 'the number of sides on the dice',
                required: false,
                minValue: 1,
                maxValue: 1024,
            },
        ],
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

        await interaction.deferReply();

        const amount_of_dice = interaction.options.getInteger('amount', false) ?? 1;
        const number_of_sides = interaction.options.getInteger('sides', false) ?? 6;

        const rolled_dice = rollDice(amount_of_dice, number_of_sides);
        const combined_dice_value = rolled_dice.reduce((a, b) => a + b, 0);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: `Rolled ${amount_of_dice}, ${number_of_sides ?? 6}-sided ${amount_of_dice === 1 ? 'die' : 'dice'}!`,
                    description: amount_of_dice === 1 ? (
                        `${interaction.user}, you rolled a **${combined_dice_value}**`
                    ) : amount_of_dice <= 100 ? (
                        `${interaction.user}, you rolled ${rolled_dice.map((die_value) => `**${die_value}**`).join(' + ')} = **${combined_dice_value}**`
                    ) : (
                        `${interaction.user}, you rolled a combined total of **${combined_dice_value}**`
                    ),
                }),
            ],
        });
    },
});
