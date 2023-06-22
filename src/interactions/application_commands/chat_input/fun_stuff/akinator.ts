//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { Aki as Akinator, answers as AkinatorAnswers } from 'aki-api';

import { CustomEmbed, disableMessageComponents, requestPotentialNotSafeForWorkContentConsent } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

// define our own type for the guess object since aki-api doesn't export one
// some of the properties we're not interested in are excluded
type AkinatorGuess = {
    id: string;
    name: string;
    id_base: string;
    absolute_picture_path: string;
    award_id: string;
    corrupt: string;
    description: string;
    picture_path: string;
    pseudo: string;
    ranking: string;
    relative: string;
    nsfw?: boolean;
};

//------------------------------------------------------------//

const akinator_image_url = 'https://cdn.midspike.com/projects/iris/akinator-idle_2022-06-06_0.png';

const akinator_credit_text = 'Powered by https://akinator.com/';

//------------------------------------------------------------//

async function generateMessagePayload(
    current_step: number,
    question: string,
): Promise<Discord.WebhookMessageEditOptions> {
    return {
        embeds: [
            CustomEmbed.from({
                title: `Akinator > Question #${current_step + 1}`,
                description: `${question}`,
                footer: {
                    text: akinator_credit_text,
                },
                thumbnail: {
                    url: akinator_image_url,
                },
            }),
        ],
        components: [
            {
                type: Discord.ComponentType.ActionRow,
                components: [
                    {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: `akinator_button__step_${AkinatorAnswers.Yes}`,
                        label: 'Yes',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: `akinator_button__step_${AkinatorAnswers.No}`,
                        label: 'No',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: `akinator_button__step_${AkinatorAnswers.DontKnow}`,
                        label: 'Don\'t Know',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: `akinator_button__step_${AkinatorAnswers.Probably}`,
                        label: 'Probably',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: `akinator_button__step_${AkinatorAnswers.ProbablyNot}`,
                        label: 'Probably Not',
                    },
                ],
            }, {
                type: Discord.ComponentType.ActionRow,
                components: [
                    {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Primary,
                        customId: 'akinator_button__previous',
                        label: 'Show Previous Question',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Danger,
                        customId: 'akinator_button__end_session',
                        label: 'End Akinator Session',
                    },
                ],
            },
        ],
    };
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'akinator',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'play akinator directly within discord',
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

        const bot_initial_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Akinator > Loading...',
                    footer: {
                        text: akinator_credit_text,
                    },
                }),
            ],
        });

        const akinator = new Akinator({
            region: 'en',
            childMode: false,
        });

        const akinator_start_question = await akinator.start();

        await interaction.editReply(
            await generateMessagePayload(akinator.currentStep, akinator_start_question.question)
        );

        const button_interaction_collector = bot_initial_message.createMessageComponentCollector({
            time: 5 * 60_000, // 5 minutes
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            if (!(button_interaction.message instanceof Discord.Message)) return;

            if (button_interaction.user.id !== interaction.user.id) {
                await button_interaction.followUp({
                    ephemeral: true,
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Red,
                            description: `${button_interaction.user}, don\'t interfere with ${interaction.user}\'s Akinator session!`,
                        }),
                    ],
                });

                return;
            }

            switch (button_interaction.customId) {
                case 'akinator_button__previous': {
                    if (akinator.currentStep <= 0) return;
                    button_interaction_collector.resetTimer();

                    await disableMessageComponents(button_interaction.message);

                    const akinator_previous_question = await akinator.back();

                    await button_interaction.editReply(
                        await generateMessagePayload(akinator.currentStep, akinator_previous_question.question)
                    );

                    break;
                }

                case 'akinator_button__end_session': {
                    button_interaction_collector.stop();

                    break;
                }

                default: {
                    if (!button_interaction.customId.startsWith('akinator_button__step_')) return;

                    await disableMessageComponents(button_interaction.message);

                    const answer_id = Number.parseInt(button_interaction.customId.replace('akinator_button__step_', ''), 10) as AkinatorAnswers;

                    const akinator_step_question = await akinator.step(answer_id);

                    const akinator_has_a_guess = akinator.progress >= 80 || akinator.currentStep >= 78;
                    if (akinator_has_a_guess) {
                        button_interaction_collector.stop();

                        const akinator_win_result = await akinator.win();
                        const akinator_guess = akinator_win_result.guesses.at(0)! as AkinatorGuess;

                        await button_interaction.editReply({
                            embeds: [
                                CustomEmbed.from({
                                    title: 'Akinator > Guess',
                                    description: [
                                        '**It is very clear to me now!**',
                                        'You are looking for this character:',
                                    ].join('\n'),
                                    fields: [
                                        {
                                            name: 'Character Name',
                                            value: `${akinator_guess.name}`,
                                        }, {
                                            name: 'Character Description',
                                            value: `${akinator_guess.description}`,
                                        }, {
                                            name: 'Questions Used',
                                            value: `${akinator.currentStep + 1}`,
                                        },
                                    ],
                                    footer: {
                                        text: akinator_credit_text,
                                    },
                                    thumbnail: {
                                        url: akinator_image_url,
                                    },
                                    image: {
                                        url: akinator_guess.absolute_picture_path,
                                    },
                                }),
                            ],
                            components: [], // remove all components
                        });

                        return;
                    }

                    await button_interaction.editReply(
                        await generateMessagePayload(akinator.currentStep, akinator_step_question.question)
                    );

                    break;
                }
            }
        });

        button_interaction_collector.on('end', async (collected_interactions, reason) => {
            const most_recent_interaction = collected_interactions.last();

            if (!most_recent_interaction) return;
            if (!most_recent_interaction.inCachedGuild()) return;

            await disableMessageComponents(most_recent_interaction.message);
        });
    },
});
