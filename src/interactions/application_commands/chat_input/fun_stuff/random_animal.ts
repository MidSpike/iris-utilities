//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { CustomEmbed, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

/* enum values must be lowercase */
enum AnimalType {
    DOG = 'dog',
    CAT = 'cat',
    FOX = 'fox',
    PANDA = 'panda',
}

type DogApiResponseData = {
    status: 'success' | string;
    message: string;
};

type CatApiResponseData = {
    file: string;
};

type FoxApiResponseData = {
    image: string;
};

type PandaApiResponseData = {
    link: string;
};

//------------------------------------------------------------//

async function fetchRandomAnimalImageUrl(
    animal_type: AnimalType,
): Promise<string | undefined> {
    let random_animal_image_url: string | undefined;

    switch (animal_type) {
        case AnimalType.DOG: {
            random_animal_image_url = await axios({
                method: 'get',
                url: 'https://dog.ceo/api/breeds/image/random',
                validateStatus: (status_code) => status_code === 200,
            }).then(
                (response) => response.data as Partial<DogApiResponseData>,
            ).then(
                (response_data) => response_data.status === 'success' ? response_data.message : undefined
            ).catch(() => undefined);

            break;
        }

        case AnimalType.CAT: {
            random_animal_image_url = await axios({
                method: 'get',
                url: 'https://aws.random.cat/meow',
                validateStatus: (status_code) => status_code === 200,
            }).then(
                (response) => response.data as Partial<CatApiResponseData>
            ).then(
                (response_data) => response_data.file
            ).catch(() => undefined);

            break;
        }

        case AnimalType.FOX: {
            random_animal_image_url = await axios({
                method: 'get',
                url: 'https://randomfox.ca/floof/',
                validateStatus: (status_code) => status_code === 200,
            }).then(
                (response) => response.data as Partial<FoxApiResponseData>
            ).then(
                (response_data) => response_data.image
            ).catch(() => undefined);

            break;
        }

        case AnimalType.PANDA: {
            random_animal_image_url = await axios({
                method: 'get',
                url: 'https://some-random-api.ml/img/panda',
                validateStatus: (status_code) => status_code === 200,
            }).then(
                (response) => response.data as Partial<PandaApiResponseData>
            ).then(
                (response_data) => response_data.link
            ).catch(() => undefined);

            break;
        }

        default: {
            throw new Error(`Unknown animal type: ${animal_type}`);
        }
    }

    return random_animal_image_url;
}

//------------------------------------------------------------//

async function generateMessagePayload(
    animal_type: AnimalType,
): Promise<Discord.MessageOptions> {
    const random_animal_image_url = await fetchRandomAnimalImageUrl(animal_type);

    if (!random_animal_image_url) {
        return {
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    title: `Random ${animal_type}`,
                    description: 'Failed to fetch random image.',
                }),
            ],
            components: [],
        };
    }

    return {
        embeds: [
            CustomEmbed.from({
                title: `Random ${animal_type}`,
                image: {
                    url: random_animal_image_url,
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
                        customId: 'random_animal_button',
                        label: `Generate another random ${animal_type}`,
                    },
                ],
            },
        ],
    };
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'random_animal',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'n/a',
        type: Discord.ApplicationCommandType.ChatInput,
        options: Object.values(AnimalType).map((animal_type) => ({
            type: Discord.ApplicationCommandOptionType.Subcommand,
            name: animal_type,
            description: 'n/a',
            options: [],
        })),
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

        const subcommand_name = interaction.options.getSubcommand(true) as AnimalType;

        const bot_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Loading...',
                }),
            ],
        });

        const button_interaction_collector = bot_message.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            time: 60_000, // 1 minute
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            if (button_interaction.customId !== 'random_animal_button') return;

            if (button_interaction.user.id !== interaction.user.id) {
                await button_interaction.followUp({
                    ephemeral: true,
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.colors.VIOLET,
                            description: `Please don\`t interfere with ${interaction.user}'s session.`,
                        }),
                    ],
                });

                return;
            }

            button_interaction_collector.resetTimer();

            await button_interaction.editReply(await generateMessagePayload(subcommand_name));
        });

        button_interaction_collector.on('end', async (collected_interactions) => {
            const most_recent_interaction = collected_interactions.last();

            if (!most_recent_interaction) return;
            if (!most_recent_interaction.inCachedGuild()) return;

            await disableMessageComponents(most_recent_interaction.message);
        });

        await interaction.editReply(await generateMessagePayload(subcommand_name));
    },
});
