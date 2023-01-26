//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import nodeHtmlToImage from 'node-html-to-image';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { escapeHtml } from '@root/common/lib/utilities';

//------------------------------------------------------------//

type InsultApiResponseData = {
    number: string; // "1"
    language: 'en' | string; // "en"
    insult: string; // "Example insult"
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'roast',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'roasts a user with a random insult',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                type: Discord.ApplicationCommandOptionType.User,
                name: 'user',
                description: 'the user to roast',
                required: false,
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
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const member = interaction.options.getMember('user') ?? interaction.member;

        const insult_api_response_data = await axios({
            method: 'get',
            url: `https://evilinsult.com/generate_insult.php?v=${Date.now()}&lang=en&type=json`,
            validateStatus: (status_code) => status_code === 200,
        }).then((response) => response.data as InsultApiResponseData);

        const insult_text = insult_api_response_data.insult;

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
                        div.insult-parent {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 2rem;
                        }
                        div.insult-content {
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
                        <div class="insult-content">
                            <div class="insult">
                                ${escapeHtml(insult_text)}
                            </div>
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

        const embed = CustomEmbed.from({
            image: {
                url: `attachment://${attachment_name}`,
            },
        });

        await interaction.editReply({
            files: [
                attachment,
            ],
            content: `${member}, you have been roasted by ${interaction.user}`,
            embeds: [
                embed,
            ],
        });
    },
});
