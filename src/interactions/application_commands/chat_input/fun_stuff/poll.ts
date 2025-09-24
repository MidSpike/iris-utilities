//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import nodeHtmlToImage from 'node-html-to-image';

import { escapeHtml, inclusiveRange } from '@root/common/lib/utilities';

import { CustomEmbed, CustomEmoji } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'poll',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'creates a poll with up to 10 choices',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'title',
                description: 'The title of the poll',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'description',
                description: 'A description for the poll',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'option0',
                description: 'That\'s right \'option0\', programmers start counting at 0. ;)',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'option1',
                description: 'Hello \'option2\'. Wait a minute... I meant \'option1\'. ;)',
                required: true,
            },
            ...Array.from(inclusiveRange(2, 9)).map(
                (number) => ({
                    type: Discord.ApplicationCommandOptionType.String,
                    name: `option${number}`,
                    description: ';)',
                    required: false,
                }) as Discord.ApplicationCommandOptionData,
            ),
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

        const poll_title = interaction.options.getString('title', true);
        const poll_description = interaction.options.getString('description', true);
        const poll_options = [
            interaction.options.getString('option0', true),
            interaction.options.getString('option1', true),
            ...Array.from(inclusiveRange(2, 9)).map(
                (number) => interaction.options.getString(`option${number}`, false) ?? undefined,
            ).filter(
                (option) => typeof option === 'string',
            ) as string[],
        ];

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
                            text-align: left;
                            font-family: Helvetica, Arial, sans-serif;
                            font-weight: 900;
                            text-shadow: 0.1em 0.1em 0.1em #000000;
                        }
                        div.parent {
                            background-image: radial-gradient(circle at center, hsl(20, 100%, 5%), hsl(20, 100%, 22%));
                            padding: 2rem;
                        }
                        div.options {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 2rem;
                        }
                        div.option {
                            border: 0.25rem solid #000000;
                            border-radius: 1rem;
                            backdrop-filter: blur(0.5rem);
                            background-color: hsla(20, 100%, 5%, 0.5);
                            width: 100%;
                            height: auto;
                            padding: 1rem;
                            font-size: 2rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="parent">
                        <div class="options">
                            ${poll_options.map(
                                (option, index) => [
                                    '<div class="option">',
                                    `   ${index} - ${escapeHtml(option)}`,
                                    '</div>',
                                ].join('\n')
                            ).join('\n')}
                        </div>
                    </div>
                </body>
            </html>
        `;

        const image_buffer = await nodeHtmlToImage({
            type: 'png',
            encoding: 'binary',
            html: html_for_image,
            waitUntil: 'load',
        }) as Buffer;

        const attachment_name = `attachment-${Date.now()}.png`;
        const attachment = new Discord.AttachmentBuilder(image_buffer, { name: attachment_name });

        const embed = CustomEmbed.from({
            author: {
                icon_url: interaction.member.displayAvatarURL({ forceStatic: false, size: 4096 }),
                name: interaction.member.displayName,
            },
            title: `${Discord.escapeMarkdown(poll_title)}`,
            description: `${Discord.escapeMarkdown(poll_description)}`,
            image: {
                url: `attachment://${attachment_name}`,
            },
        });

        await interaction.deleteReply();

        const bot_message = await interaction.channel.send({
            files: [
                attachment,
            ],
            embeds: [
                embed,
            ],
        });

        const emojis = [
            CustomEmoji.Identifiers.Zero,
            CustomEmoji.Identifiers.One,
            CustomEmoji.Identifiers.Two,
            CustomEmoji.Identifiers.Three,
            CustomEmoji.Identifiers.Four,
            CustomEmoji.Identifiers.Five,
            CustomEmoji.Identifiers.Six,
            CustomEmoji.Identifiers.Seven,
            CustomEmoji.Identifiers.Eight,
            CustomEmoji.Identifiers.Nine,
        ].slice(0, poll_options.length);

        for (const emoji of emojis) {
            await bot_message.react(emoji);
        }
    },
});
