//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

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
    identifier: 'color',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'n/a',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                name: 'hex',
                description: 'displays a color from a 6-digit hex code',
                type: Discord.ApplicationCommandOptionType.String,
                minLength: 1,
                maxLength: 10,
                required: true,
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
        if (!interaction.inCachedGuild()) return;
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const hex = interaction.options.getString('hex', true).replace(/[^0-9a-f]/gi, '');

        const color_decimal = Number.parseInt(hex, 16);

        if (
            Number.isNaN(color_decimal) ||
            color_decimal < 0x000000 ||
            color_decimal > 0xFFFFFF
        ) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        title: 'Invalid Hex Code',
                        description: 'The hex code you provided is invalid.',
                    }),
                ],
            });

            return;
        }

        const color_rgb = decimalColorToRgb(color_decimal);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: color_decimal,
                    title: 'Color',
                    fields: [
                        {
                            name: 'Decimal',
                            value: `\`${color_decimal.toString(10)}\``,
                            inline: true,
                        }, {
                            name: 'Hexadecimal',
                            value: `\`#${color_decimal.toString(16)}\``,
                            inline: true,
                        }, {
                            name: 'Rgb',
                            value: `\`${color_rgb.join(', ')}\``,
                            inline: true,
                        },
                    ],
                    image: {
                        // documentation: https://singlecolorimage.com/api.html
                        // generate a mono-color image with the dimensions of 1920x540
                        url: `https://singlecolorimage.com/get/${color_decimal.toString(16)}/1920x540`,
                    },
                }),
            ],
        });
    },
});
