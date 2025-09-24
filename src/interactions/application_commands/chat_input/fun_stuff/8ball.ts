//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { delay, randomItemFromArray } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const magic_8_ball_responses = [
    'It is certain.',
    'It is decidedly so.',
    'Without a doubt.',
    'Yes - definitely.',
    'You may rely on it.',
    'As I see it, yes.',
    'Most likely.',
    'Outlook good.',
    'Yes.',
    'Signs point to yes.',
    'Reply hazy, try again.',
    'Ask again later.',
    'Better not tell you now.',
    'Cannot predict now.',
    'Concentrate and ask again.',
    'Don\'t count on it.',
    'My reply is no.',
    'My sources say no.',
    'Outlook not so good.',
    'Very doubtful.',
];

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: '8ball',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'see what the magic 8 ball has to say',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'question',
                description: 'What do you want to ask the magic 8 ball?',
                required: true,
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

        const question = interaction.options.getString('question', true);

        if (question.length < 1) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user} you need to ask a question!`,
                    }),
                ],
            });

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Shaking the Magic 8 Ball...',
                    image: {
                        url: 'https://cdn.midspike.com/projects/iris/man-shaking-8-ball.gif',
                    },
                }),
            ],
        });

        await delay(7_500); // wait 7.5 seconds

        const random_8ball_response = randomItemFromArray(magic_8_ball_responses);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Magic 8 Ball',
                    fields: [
                        {
                            name: 'You asked',
                            value: [
                                '\`\`\`',
                                Discord.escapeMarkdown(question),
                                '\`\`\`',
                            ].join('\n'),
                            inline: false,
                        }, {
                            name: 'The Magic 8 Ball said',
                            value: [
                                '\`\`\`',
                                Discord.escapeMarkdown(random_8ball_response),
                                '\`\`\`',
                            ].join('\n'),
                            inline: false,
                        },
                    ],
                    thumbnail: {
                        url: 'https://cdn.midspike.com/projects/iris/magic-8-ball.webp',
                    },
                }),
            ],
        });
    },
});
