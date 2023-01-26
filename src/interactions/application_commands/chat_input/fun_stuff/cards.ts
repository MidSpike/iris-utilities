//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import * as fs from 'node:fs';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import nodeHtmlToImage from 'node-html-to-image';

import { escapeHtml, randomItemFromArray } from '@root/common/lib/utilities';

import { CustomEmbed, requestPotentialNotSafeForWorkContentConsent } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

type Card = {
    id: number,
    cardType: 'Q' | 'A',
    text: string,
    numAnswers: number,
    expansion: 'Base' | 'ExpansionPack1' | 'ExpansionPack2' | 'ExpansionPack3' | 'Grognards' | 'Weeaboo' | 'Xmas' | 'Indy' | 'NotSafeForHumanity' | 'Image1',
};

//------------------------------------------------------------//

const cah_card_set: Card[] = JSON.parse(
    fs.readFileSync(
        path.join(process.cwd(), 'misc', 'cards_against_humanity.json'),
        {
            encoding: 'utf8',
        }
    )
);

const black_cards = cah_card_set.filter((card) => card.cardType === 'Q');
const white_cards = cah_card_set.filter((card) => card.cardType === 'A');

//------------------------------------------------------------//

async function updateMessageWithNewContent(discord_client: Discord.Client<true>, message: Discord.Message) {
    const selected_black_card = randomItemFromArray(black_cards.filter((card) => card.numAnswers === 2));
    const selected_white_cards = Array.from({ length: selected_black_card.numAnswers }, () => randomItemFromArray(white_cards));

    const html_for_image = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    * {
                        box-sizing: border-box;
                    }
                    html {
                        display: flex;
                        width: auto;
                        height: auto;
                    }
                    body {
                        width: auto;
                        height: auto;
                    }
                    div {
                        text-align: left;
                        font-family: Helvetica, Arial, sans-serif;
                        font-weight: 900;
                    }
                    div.cards-container-parent {
                        background-image: radial-gradient(circle at center, hsl(20, 100%, 5%), hsl(20, 100%, 22%));
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        max-width: 50rem;
                        padding: 1rem;
                    }
                    div.cards-container {
                        padding: 1rem;
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        grid-template-rows: 1fr;
                        gap: 1rem;
                        width: 100%;
                    }
                    div.card-box {
                        display: flex;
                        flex-direction: row;
                        flex-wrap: nowrap;
                        justify-content: stretch;
                        align-items: stretch;
                        flex-grow: 1;
                        gap: 2rem;
                        aspect-ratio: 2 / 3;
                    }
                    div.card-content {
                        border-radius: 1rem;
                        backdrop-filter: blur(0.5rem);
                        position: relative;
                        display: block;
                        width: 100%;
                        height: 100%;
                        padding: 1rem;
                        font-size: 1.25rem;
                        word-break: break-word;
                    }
                    div.card-content::after {
                        content: "";
                        background-image: url('https://iris-utilities.com/assets/visual/logo/logo_t_2020-08-30-1_1024x.png');
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        display: block;
                        position: absolute;
                        bottom: 0.25rem;
                        right: 0.5rem;
                        width: 2.5rem;
                        height: 2.5rem;
                    }
                    div.card-box[data-card-type="black-card"] div.card-content {
                        border: 0.25rem solid #ffffff;
                        background-color: #000000;
                        color: #ffffff;
                    }
                    div.card-box[data-card-type="white-card"] div.card-content {
                        border: 0.25rem solid #000000;
                        background-color: #ffffff;
                        color: #000000;
                    }
                </style>
            </head>
            <body>
                <div class="cards-container-parent">
                    <div class="cards-container">
                        <div class="card-box" data-card-type="black-card">
                            <div class="card-content">
                                ${escapeHtml(selected_black_card.text.replace(/([_]+)/gi, '_____'))}
                            </div>
                        </div>
                        ${selected_white_cards.map((selected_white_card) => `
                            <div class="card-box" data-card-type="white-card">
                                <div class="card-content">
                                    ${escapeHtml(selected_white_card.text)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </body>
        </html>
    `;

    const image_base64 = await nodeHtmlToImage({
        type: 'png',
        encoding: 'base64',
        html: html_for_image,
        waitUntil: 'load',
    }) as string;

    const image_buffer = Buffer.from(image_base64, 'base64');
    const attachment_name = `attachment-${Date.now()}.png`;
    const attachment = new Discord.AttachmentBuilder(image_buffer, { name: attachment_name });

    await message.edit({
        files: [
            attachment,
        ],
        embeds: [
            CustomEmbed.from({
                title: `Cards Against ${discord_client.user.username}`,
                image: {
                    url: `attachment://${attachment_name}`,
                },
                footer: {
                    text: 'Inspired by Cards Against Humanity',
                },
            }),
        ],
    });
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'cards',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'play a game of cards against [redacted]',
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
            await bot_message.edit({
                components: [],
            });
        });
    },
});
