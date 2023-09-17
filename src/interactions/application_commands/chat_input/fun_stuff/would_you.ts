//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import axios from 'axios';

import nodeHtmlToImage from 'node-html-to-image';

import * as htmlEntitiesParser from 'html-entities';

import { CustomEmbed, requestPotentialNotSafeForWorkContentConsent } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { escapeHtml } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const yes_button = new Discord.ButtonBuilder()
    .setStyle(Discord.ButtonStyle.Success)
    .setCustomId('would_you_rather__yes_button')
    .setLabel('Yes')
    .setDisabled(false);

const no_button = new Discord.ButtonBuilder()
    .setStyle(Discord.ButtonStyle.Danger)
    .setCustomId('would_you_rather__no_button')
    .setLabel('No')
    .setDisabled(false);

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'would_you',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'asks a random question with a dilemma of two choices',
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

        const user_consents_to_potential_nsfw = await requestPotentialNotSafeForWorkContentConsent(interaction.channel!, interaction.user);
        if (!user_consents_to_potential_nsfw) return await interaction.deleteReply();

        const bot_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        const { data: response_data } = await axios({
            method: 'post',
            url: 'https://v4.willyoupressthebutton.com/api/dilemma/random',
            headers: {
                'Content-Type': 'application/json',
            },
            data: {},
            validateStatus: (status) => status === 200,
        }) as {
            data: {
                link: string, // `${number}`
                upside: string,
                downside: string,
                yes: number,
                no: number,
            },
        };

        const dilemma_id: string = response_data.link;
        const dilemma_situation: string = htmlEntitiesParser.decode(response_data.upside);
        const dilemma_exception: string = htmlEntitiesParser.decode(response_data.downside);
        const dilemma_yes_votes_count: number = response_data.yes;
        const dilemma_no_votes_count: number = response_data.no;

        const dilemma_total_votes = dilemma_yes_votes_count + dilemma_no_votes_count;
        const dilemma_yes_votes_percentage = Math.round(dilemma_yes_votes_count / dilemma_total_votes * 100);
        const dilemma_no_votes_percentage = Math.round(dilemma_no_votes_count / dilemma_total_votes * 100);

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
                            color: #ff5500;
                            font-size: 2rem;
                            text-align: center;
                            font-family: Helvetica, Arial, sans-serif;
                            font-weight: 900;
                            text-shadow: 0.1em 0.1em 0.1em #000000;
                        }
                        div.id {
                            margin-bottom: 1rem;
                            font-size: 1.5rem;
                            text-align: left;
                        }
                        div.parent {
                            background-image: radial-gradient(circle at center, #000000, #6e2500ff);
                            padding: 2rem;
                        }
                        div.situation {
                            padding: 3rem 2rem 2rem 2rem;
                        }
                        div.break {
                            border-radius: 0.5rem !important;
                            background-color: #ff5500;
                            color: #000000;
                            width: 100%;
                            margin: 2rem 0px;
                            padding: 0.5rem;
                            font-size: 2.5rem;
                            font-weight: 900;
                            text-align: center;
                            text-transform: uppercase;
                            text-shadow: none !important;
                        }
                        div.exception {
                            padding: 2rem 2rem 3rem 2rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="parent">
                        <div class="id">
                            #${escapeHtml(dilemma_id)}
                        </div>
                        <div class="situation">
                            ${escapeHtml(dilemma_situation)}
                        </div>
                        <div class="break">
                            However
                        </div>
                        <div class="exception">
                            ${escapeHtml(dilemma_exception)}
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
        const attachment_name = `dilemma-${encodeURIComponent(dilemma_id)}.png`;
        const attachment = new Discord.AttachmentBuilder(image_buffer, { name: attachment_name });

        const dilemma_embed = CustomEmbed.from({
            title: 'Would you press the button?',
            image: {
                url: `attachment://${attachment_name}`,
            },
        });

        await interaction.editReply({
            files: [
                attachment,
            ],
            embeds: [
                dilemma_embed,
            ],
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        Discord.ButtonBuilder.from(yes_button),
                        Discord.ButtonBuilder.from(no_button),
                    ],
                },
            ],
        }).catch(() => {});

        const button_interaction_collector = bot_message.createMessageComponentCollector({
            filter: (button_interaction) => interaction.user.id === button_interaction.user.id,
            time: 5 * 60_000, // 5 minutes
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            if (!button_interaction.inCachedGuild()) return;

            await button_interaction.deferUpdate();

            switch (button_interaction.customId) {
                case 'would_you_rather__yes_button':
                case 'would_you_rather__no_button': {
                    button_interaction_collector.stop();

                    const user_said_yes = button_interaction.customId === 'would_you_rather__yes_button';
                    const user_said_no = button_interaction.customId === 'would_you_rather__no_button';
                    const majority_answered_yes = dilemma_yes_votes_percentage > dilemma_no_votes_percentage;
                    const majority_answered_no = dilemma_yes_votes_percentage < dilemma_no_votes_percentage;
                    const user_agrees_with_majority = (user_said_yes && majority_answered_yes) || (user_said_no && majority_answered_no);

                    await button_interaction.editReply({
                        files: [
                            attachment,
                        ],
                        embeds: [
                            dilemma_embed,
                            CustomEmbed.from({
                                description: [
                                    (user_agrees_with_majority ? (
                                        `${interaction.user}, it seems like the **majority of people agree** with you.`
                                    ) : (
                                        `${interaction.user}, it seems like the **majority of people disagree** with you.`
                                    )),
                                    '',
                                    (user_agrees_with_majority ? (
                                        `You said **${user_said_yes ? 'yes' : 'no'}** and the majority of people said **${majority_answered_yes ? 'yes' : 'no'}** too.`
                                    ) : (
                                        `You said **${user_said_yes ? 'yes' : 'no'}** while the majority of people said **${majority_answered_yes ? 'yes' : 'no'}**.`
                                    )),
                                    '',
                                    `**${dilemma_yes_votes_count} (${dilemma_yes_votes_percentage}% of)** people said **yes**!`,
                                    `**${dilemma_no_votes_count} (${dilemma_no_votes_percentage}% of)** people said **no**!`,
                                ].join('\n'),
                            }),
                        ],
                        components: [
                            {
                                type: Discord.ComponentType.ActionRow,
                                components: [
                                    Discord.ButtonBuilder.from(yes_button)
                                        .setStyle(user_said_yes ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Secondary)
                                        .setDisabled(true),
                                    Discord.ButtonBuilder.from(no_button)
                                        .setStyle(user_said_no ? Discord.ButtonStyle.Danger : Discord.ButtonStyle.Secondary)
                                        .setDisabled(true),
                                ],
                            },
                        ],
                    }).catch(() => {});

                    break;
                }

                default: {
                    return; // don't continue without a valid custom id
                }
            }

            button_interaction_collector.resetTimer();
        });
    },
});
