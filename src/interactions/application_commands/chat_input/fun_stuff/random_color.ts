//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { randomNumberFromInclusiveRange } from '@root/common/lib/utilities';

//------------------------------------------------------------//

/* eslint-disable no-bitwise */
function decimalColorToRgb(
    color: number, // Example: 0xff5500
): [
    number, // Example: 255
    number, // Example: 85
    number, // Example: 0
] {
    const r = color >> 16; // shift 16 bits to the right
    const g = (color >> 8) & 0xff; // shift right 8 bits and mask with 0xff
    const b = color & 0xff; // mask with 0xff

    return [ r, g, b ];
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'random_color',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'displays a random color and its common values',
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
        command_category: ClientCommandHelper.categories.FUN_STUFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.inCachedGuild()) return;
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const random_color_decimal = randomNumberFromInclusiveRange(0x000000, 0xFFFFFF);
        const random_color_rgb = decimalColorToRgb(random_color_decimal);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: random_color_decimal,
                    title: 'Random Color',
                    fields: [
                        {
                            name: 'Decimal',
                            value: `\`${random_color_decimal.toString(10)}\``,
                            inline: true,
                        }, {
                            name: 'Hexadecimal',
                            value: `\`#${random_color_decimal.toString(16)}\``,
                            inline: true,
                        }, {
                            name: 'Rgb',
                            value: `\`${random_color_rgb.join(', ')}\``,
                            inline: true,
                        },
                    ],
                    image: {
                        // documentation: https://singlecolorimage.com/api.html
                        // generate a mono-color image with the dimensions of 1920x540
                        url: `https://singlecolorimage.com/get/${random_color_decimal.toString(16)}/1920x540`,
                    },
                }),
            ],
        });
    },
});
