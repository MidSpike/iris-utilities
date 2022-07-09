//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { Aki as Akinator } from 'aki-api';

import { CustomEmbed, disableMessageComponents, requestPotentialNotSafeForWorkContentConsent } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

type AkinatorAnswerId = 0 | 1 | 2 | 3 | 4;

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

async function generateMessagePayload(akinator: Akinator): Promise<Discord.WebhookEditMessageOptions> {
    return {
        embeds: [
            CustomEmbed.from({
                title: `Akinator > Question #${akinator.currentStep + 1}`,
                description: `${akinator.question}`,
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
                components: akinator.answers.map((answer, index) => ({
                    type: Discord.ComponentType.Button,
                    style: Discord.ButtonStyle.Secondary,
                    customId: `akinator_button__step_${index}`,
                    label: `${answer}`,
                })),
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

        await akinator.start();

        interaction.editReply(await generateMessagePayload(akinator));

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
                            color: CustomEmbed.colors.RED,
                            description: `${button_interaction.user}, don\'t interfere with ${interaction.user}\'s Akinator session!`,
                        }),
                    ],
                });

                return;
            }

            switch (button_interaction.customId) {
                case 'akinator_button__previous': {
                    if (akinator.currentStep <= 0) return;

                    await disableMessageComponents(button_interaction.message);

                    await akinator.back();

                    await button_interaction.editReply(await generateMessagePayload(akinator));

                    break;
                }

                case 'akinator_button__end_session': {
                    button_interaction_collector.stop();

                    break;
                }

                default: {
                    if (!button_interaction.customId.startsWith('akinator_button__step_')) return;

                    await disableMessageComponents(button_interaction.message);

                    const step_number = Number.parseInt(button_interaction.customId.replace('akinator_button__step_', ''), 10) as AkinatorAnswerId;

                    await akinator.step(step_number);

                    const akinator_has_a_guess = akinator.progress >= 80 || akinator.currentStep >= 78;
                    if (akinator_has_a_guess) {
                        await akinator.win();

                        const akinator_guess = akinator.answers.at(0) as AkinatorGuess;

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

                        button_interaction_collector.stop();

                        return;
                    }

                    break;
                }
            }

            await button_interaction.editReply(await generateMessagePayload(akinator));

            button_interaction_collector.resetTimer();
        });

        button_interaction_collector.on('end', async (collected_interactions, reason) => {
            const most_recent_interaction = collected_interactions.last();

            if (!most_recent_interaction) return;
            if (!most_recent_interaction.inCachedGuild()) return;

            await disableMessageComponents(most_recent_interaction.message);
        });
    },
});
