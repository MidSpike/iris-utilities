//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { DiscordClientWithSharding, GuildConfigChatAiMode, GuildConfigChatAiVariant } from '@root/types';

import crypto from 'node:crypto';

import axios from 'axios';

import * as Discord from 'discord.js';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

import { CustomEmbed } from '@root/common/app/message';

import { DelayedTask, DelayedTaskQueue, EnvironmentVariableName, delay, parseEnvironmentVariable, stringChunksPreserveWords, stringEllipses } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const openai_usage = parseEnvironmentVariable(EnvironmentVariableName.OpenAiUsage, 'string');

const openai_api_key = parseEnvironmentVariable(EnvironmentVariableName.OpenAiApiKey, 'string');

const chat_ai_default_model = parseEnvironmentVariable(EnvironmentVariableName.ChatAiDefaultModel, 'string');

const chat_ai_advanced_model = parseEnvironmentVariable(EnvironmentVariableName.ChatAiAdvancedModel, 'string');

const chat_ai_max_tokens = parseEnvironmentVariable(EnvironmentVariableName.ChatAiMaxTokens, 'integer');

const chat_ai_max_user_input_size = parseEnvironmentVariable(EnvironmentVariableName.ChatAiMaxUserInputSize, 'integer');

const chat_ai_previous_messages_amount = parseEnvironmentVariable(EnvironmentVariableName.ChatAiPreviousMessagesAmount, 'integer');

//------------------------------------------------------------//

type GPTRequestData = {
    model: string,
    messages: {
        role: string,
        content: string,
    }[],
    max_tokens: number,
    user: string,
};

type GPTResponseData = {
    choices: {
        index: number,
        message: {
            role: string,
            content: string,
        },
        finish_reason: string,
    }[],
    usage: {
        total_tokens: number,
    },
};

//------------------------------------------------------------//

const chat_ai_handler_queue = new DelayedTaskQueue();

//------------------------------------------------------------//

export default async function chatArtificialIntelligenceHandler(
    discord_client: DiscordClientWithSharding,
    message: Discord.Message<true>,
): Promise<void> {
    if (openai_usage !== 'enabled') return; // don't respond if openai is not enabled

    if (!message.inGuild()) return; // don't respond to direct messages
    if (!message.member) return; // unable to get the member

    if (message.author.bot) return; // don't respond to bots
    if (message.author.system) return; // don't respond to system messages

    if (message.content.length < 1) return; // don't respond to empty messages

    /* fetch the guild config */
    const guild_config = await GuildConfigsManager.fetch(message.guild.id);

    const guild_chat_ai_mode: GuildConfigChatAiMode = guild_config.chat_ai_mode ?? GuildConfigChatAiMode.Disabled; // default to disabled
    const guild_chat_ai_channel_ids: string[] = guild_config.chat_ai_channel_ids ?? []; // default to empty array

    /* check if chat ai is enabled for the given context */
    switch (guild_chat_ai_mode) {
        case GuildConfigChatAiMode.EnhancedChannelsOnly: {
            if (guild_chat_ai_channel_ids.includes(message.channel.id)) break; // continue

            return; // don't continue
        }

        case GuildConfigChatAiMode.MentionsAndEnhancedChannels: {
            if (message.mentions.users.has(discord_client.user.id)) break; // continue

            if (guild_chat_ai_channel_ids.includes(message.channel.id)) break; // continue

            return; // don't continue
        }

        case GuildConfigChatAiMode.MentionsOnly: {
            if (message.mentions.users.has(discord_client.user.id)) break; // continue

            return; // don't continue
        }

        case GuildConfigChatAiMode.Disabled:
        default: {
            return; // don't continue
        }
    }

    const message_has_attachments = message.attachments.size > 0;
    const message_has_stickers = message.stickers.size > 0;
    if (
        message_has_attachments ||
        message_has_stickers
    ) {
        await message.reply({
            content: [
                'Sorry, but I can\'t do the following yet:',
                '- View attachments',
                '- View stickers',
                '- Listen to voice messages',
                '',
                'Try again without any of the above.',
            ].join('\n'),
        });

        return; // don't continue
    }

    const guild_chat_ai_variant: GuildConfigChatAiVariant = guild_config.chat_ai_variant ?? GuildConfigChatAiVariant.Default; // default to default
    const guild_chat_ai_token_usage_shown: boolean = guild_config.chat_ai_token_usage_shown ?? false; // default to false

    let guild_chat_ai_model: string;
    switch (guild_chat_ai_variant) {
        case GuildConfigChatAiVariant.Advanced: {
            guild_chat_ai_model = chat_ai_advanced_model;
            break;
        }

        case GuildConfigChatAiVariant.Default:
        default: {
            guild_chat_ai_model = chat_ai_default_model;
            break;
        }
    }

    /* send a typing indicator to the channel, since this may take a while */
    await message.channel.sendTyping();

    /* fetch the referenced message if it exists */
    const referenced_message_id = message.reference?.messageId;
    const referenced_message = referenced_message_id ? await message.channel.messages.fetch(referenced_message_id) : undefined;

    /* fetch the last few messages in the channel */
    const messages_collection = await message.channel.messages.fetch({
        limit: chat_ai_previous_messages_amount,
        before: referenced_message_id ?? message.id,
    });

    /* convert the collection into an array for easier manipulation and less overhead */
    const messages = messages_collection.map((msg) => msg).slice(0, chat_ai_previous_messages_amount); // slice to ensure the array is the correct size

    /* add the referenced message to the array if it exists */
    if (referenced_message) messages.push(referenced_message);

    /* add the most recent message to the array */
    messages.push(message);

    /* sort the messages from oldest to newest */
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    /**
     * Filter the messages to ensure they are valid for the AI to process.
     * This includes:
     * - Not being empty (specifically message content)
     * - Not being from a bot (except this bot)
     * - Not being too long (except this bot)
     */
    const filtered_messages = messages.filter((msg) => {
        const user_is_this_bot = msg.author.id === discord_client.user.id;

        // only allow messages from users and this bot
        if (msg.author.bot && !user_is_this_bot) return false;

        // ensure the message is not empty
        if (msg.content.length < 1) return false;

        // only allow messages under a certain size from users (this bot is allowed to exceed the limit)
        if (!user_is_this_bot && msg.content.length > chat_ai_max_user_input_size) return false;

        return true;
    });

    const gpt_messages = [
        {
            role: 'system',
            content: [
                `You are ${discord_client.user.username} (aka ${Discord.userMention(discord_client.user.id)}), a discord bot on Discord.`,
                'Converse like a human,',
                'pretend to not be an ai,',
                'keep your responses very short,',
                'and refrain from using emojis.',
            ].join('\n'),
        },
        ...filtered_messages.map(
            (msg) => ({
                role: msg.author.id === discord_client.user.id ? 'assistant' : 'user',
                content: msg.content,
            })
        ),
    ];

    /* enqueue the task to be processed */
    chat_ai_handler_queue.enqueue(
        new DelayedTask(
            2_500, // wait a bit to throttle the requests
            async () => {
                // apply a simple hash to the user id to mask the raw user id from openai
                const hashed_user_id = crypto.createHash('sha256').update(message.author.id).digest('hex');

                const gpt_request_data: GPTRequestData = {
                    'model': guild_chat_ai_model,
                    'messages': gpt_messages,
                    'max_tokens': chat_ai_max_tokens,
                    'user': hashed_user_id, // used for tracking potential abuse on OpenAI's end
                };

                const gpt_response = await axios({
                    method: 'POST',
                    url: 'https://api.openai.com/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${openai_api_key}`,
                        'Content-Type': 'application/json',
                    },
                    data: gpt_request_data,
                    validateStatus: (status) => true,
                });

                if (gpt_response.status !== 200) {
                    console.warn('Failed to generate a response from GPT:', gpt_response);

                    const error_message_from_response = gpt_response.data?.error?.message as string | undefined;
                    const error_message = error_message_from_response ? [
                        'Unable to process your request at this time.',
                        'Please try again later.',
                        '',
                        'Error message received from OpenAI:',
                        '\`\`\`',
                        stringEllipses(error_message_from_response, 1_000), // truncate the error message
                        '\`\`\`',
                    ].join('\n') : 'An unknown error has occurred.';

                    await message.channel.send({
                        reply: {
                            messageReference: message,
                        },
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Red,
                                title: 'Error',
                                description: error_message,
                            }),
                        ],
                    });

                    return;
                }

                const gpt_response_data = gpt_response.data as GPTResponseData;
                const gpt_response_message = gpt_response_data?.choices?.[0]?.message?.content;
                const gpt_response_total_tokens = gpt_response_data?.usage?.total_tokens ?? 0;

                if (!gpt_response_message) {
                    console.warn('Failed to retrieve response message content from GPT:', gpt_response);

                    await message.channel.send({
                        reply: {
                            messageReference: message,
                        },
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Red,
                                title: 'Error',
                                description: 'Failed to retrieve response message content from OpenAI.',
                            }),
                        ],
                    });

                    return;
                }

                const gpt_response_message_chunks = stringChunksPreserveWords(gpt_response_message, 500);

                for (let i = 0; i < gpt_response_message_chunks.length; i++) {
                    const gpt_response_message_chunk = gpt_response_message_chunks[i]!;

                    const is_last_message = i === gpt_response_message_chunks.length - 1;

                    const escaped_gpt_response_message_chunk = Discord.escapeMarkdown(gpt_response_message_chunk);

                    await message.reply({
                        allowedMentions: {
                            parse: [],
                            roles: [],
                            users: [],
                            repliedUser: true,
                        },
                        // only reply to the original message with the first message that is sent
                        ...(i === 0 ? [
                            {
                                reply: {
                                    messageReference: message,
                                },
                            },
                        ] : []),
                        content: stringEllipses(escaped_gpt_response_message_chunk, 2_000), // truncate the message to abide by Discord's message length limit
                        embeds: [
                            ...(
                                (
                                    guild_chat_ai_token_usage_shown && // only show if the guild has it enabled in the config
                                    is_last_message // only show on the last message sent
                                ) ? [
                                    CustomEmbed.from({
                                        description: `Total tokens used: ${gpt_response_total_tokens}`,
                                    }),
                                ] : [
                                    // no embeds
                                ]
                            ),
                        ],
                    });

                    // don't delay if this is the last message to send
                    if (i === gpt_response_message_chunks.length - 1) break;

                    // send a typing indicator to the channel for the next message to be sent
                    await message.channel.sendTyping();

                    // delay a bit before sending the typing indicator (this is required so Discord doesn't ignore the typing indicator)
                    await delay(500);

                    // delay for a bit longer if there are a lot of messages left to send
                    await delay(gpt_response_message_chunks.length > 2 ? 1_000 : 250);
                }
            },
        ),
    );
}
