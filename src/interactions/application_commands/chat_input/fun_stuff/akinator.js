'use strict';

//------------------------------------------------------------//

const { Aki: Akinator } = require('aki-api');

const Discord = require('discord.js');

const { CustomEmbed, disableMessageComponents, requestPotentialNotSafeForWorkContentConsent } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

// const akinator_image_url = 'https://cdn.midspike.com/projects/iris/akinator_idle.png';
const akinator_image_url = 'https://en.akinator.com/bundles/elokencesite/images/akinator.png?v94';

const akinator_credit_text = 'Powered by https://akinator.com/';

//------------------------------------------------------------//

async function generateMessagePayload(akinator) {
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
                type: 1,
                components: [
                    ...akinator.answers.map((answer, index) => ({
                        type: 2,
                        style: 2,
                        custom_id: `akinator_button__step_${index}`,
                        label: `${answer}`,
                    })),
                ],
            }, {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        custom_id: 'akinator_button__previous',
                        label: 'Show Previous Question',
                    }, {
                        type: 2,
                        style: 4,
                        custom_id: 'akinator_button__end_session',
                        label: 'End Akinator Session',
                    },
                ],
            },
        ],
    };
}

//------------------------------------------------------------//

module.exports.default = new ClientInteraction({
    identifier: 'akinator',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        description: 'n/a',
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('FUN_STUFF'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const user_consents_to_potential_nsfw = await requestPotentialNotSafeForWorkContentConsent(interaction.channel, interaction.user);
        if (!user_consents_to_potential_nsfw) return;

        /** @type {Discord.Message?} */
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

            if (button_interaction.user.id !== interaction.user.id) {
                await interaction.followUp({
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

                    const step_number = Number.parseInt(button_interaction.customId.replace('akinator_button__step_', ''));

                    await akinator.step(step_number);

                    const akinator_has_a_guess = akinator.progress >= 80 || akinator.currentStep >= 78;
                    if (akinator_has_a_guess) {
                        await akinator.win();

                        const akinator_guess = akinator.answers.at(0);

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

            await disableMessageComponents(most_recent_interaction.message);
        });
    },
});
