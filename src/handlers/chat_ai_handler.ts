//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { DiscordClientWithSharding, GuildConfigChatAiMode } from '@root/types';

import crypto from 'node:crypto';

import axios from 'axios';

import * as Discord from 'discord.js';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

import { CustomEmbed } from '@root/common/app/message';

import { DelayedTask, DelayedTaskQueue, delay, stringChunksPreserveWords } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const openai_usage = `${process.env.OPENAI_USAGE ?? ''}`;
if (openai_usage.length < 1) throw new Error('OPENAI_USAGE environment variable is improperly set');

const openai_api_key = `${process.env.OPENAI_API_KEY ?? ''}`;
if (openai_api_key.length < 1) throw new Error('OPENAI_API_KEY environment variable is improperly set');

const chat_ai_model = `${process.env.CHAT_AI_MODEL ?? ''}`;
if (chat_ai_model.length < 1) throw new Error('CHAT_AI_MODEL environment variable is improperly set');

const chat_ai_max_tokens: number = Number.parseInt(`${process.env.CHAT_AI_MAX_TOKENS}`, 10);
if (Number.isNaN(chat_ai_max_tokens)) throw new Error('CHAT_AI_MAX_TOKENS environment variable is not a valid number');

const chat_ai_max_user_input_size: number = Number.parseInt(`${process.env.CHAT_AI_MAX_USER_INPUT_SIZE}`, 10);
if (Number.isNaN(chat_ai_max_user_input_size)) throw new Error('CHAT_AI_MAX_USER_INPUT_SIZE environment variable is not a valid number');

const chat_ai_previous_messages_amount: number = Number.parseInt(`${process.env.CHAT_AI_PREVIOUS_MESSAGES_AMOUNT}`, 10);
if (Number.isNaN(chat_ai_previous_messages_amount)) throw new Error('CHAT_AI_PREVIOUS_MESSAGES_AMOUNT environment variable is not a valid number');

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

    /* fetch the guild config */
    const guild_config = await GuildConfigsManager.fetch(message.guild.id);

    /* check if the guild has configured chat ai */
    if (typeof guild_config.chat_ai_mode !== 'string') return; // don't continue

    /* check if chat ai is enabled for the given context */
    switch (guild_config.chat_ai_mode) {
        case GuildConfigChatAiMode.EnhancedChannelsOnly: {
            if (!Array.isArray(guild_config.chat_ai_channel_ids)) return; // don't continue
            if (guild_config.chat_ai_channel_ids.includes(message.channel.id)) break; // continue

            return; // don't continue
        }

        case GuildConfigChatAiMode.MentionsAndEnhancedChannels: {
            if (message.mentions.has(discord_client.user.id)) break; // continue

            if (!Array.isArray(guild_config.chat_ai_channel_ids)) return; // don't continue
            if (guild_config.chat_ai_channel_ids.includes(message.channel.id)) break; // continue

            return; // don't continue
        }

        case GuildConfigChatAiMode.MentionsOnly: {
            if (message.mentions.has(discord_client.user.id)) break; // continue

            return; // don't continue
        }

        case GuildConfigChatAiMode.Disabled:
        default: {
            return; // don't continue
        }
    }

    /* send a typing indicator to the channel, since this may take a while */
    await message.channel.sendTyping();

    /* fetch the last few messages in the channel */
    const messages_collection = await message.channel.messages.fetch({
        limit: chat_ai_previous_messages_amount,
        before: message.id,
    });

    // convert the collection into an array for easier manipulation and less overhead
    const messages = messages_collection.map((msg) => msg);

    // add the most recent message to the array
    messages.push(message);

    // sort the messages from oldest to newest
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

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
            content: `You are ${discord_client.user.username} (aka <@${discord_client.user.id}>), converse like a human, keep your response short and don\'t use emojis.`,
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
            5_000, // wait a bit to throttle the requests
            async () => {
                // apply a simple hash to the user id to mask the raw user id from openai
                const hashed_user_id = crypto.createHash('sha256').update(message.author.id).digest('hex');

                const gpt_request_data: GPTRequestData = {
                    'model': chat_ai_model,
                    'messages': gpt_messages,
                    'max_tokens': chat_ai_max_tokens,
                    'user': hashed_user_id, // used for tracking abuse on OpenAI's end
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
                    console.warn('Failed to generate a response from GPT:', {
                        'response': gpt_response,
                        'response_data': gpt_response.data,
                    });

                    return;
                }

                const gpt_response_data = gpt_response.data as GPTResponseData;
                const gpt_response_message = gpt_response_data?.choices?.[0]?.message?.content ?? 'Failed to generate a response.';
                const gpt_response_total_tokens = gpt_response_data?.usage?.total_tokens ?? 0;

                const gpt_response_message_chunks = stringChunksPreserveWords(gpt_response_message, 1000);

                for (let i = 0; i < gpt_response_message_chunks.length; i++) {
                    const gpt_response_message_chunk = gpt_response_message_chunks[i];

                    await message.channel.send({
                        // only reply to the original message with the first message that is sent
                        ...(i === 0 ? [
                            {
                                reply: {
                                    messageReference: message,
                                },
                            },
                        ] : []),
                        content: gpt_response_message_chunk,
                        embeds: [
                            // only add the total tokens embed to the last message
                            ...(i === gpt_response_message_chunks.length - 1 ? [
                                CustomEmbed.from({
                                    description: `Total tokens used: ${gpt_response_total_tokens}`,
                                }),
                            ] : []),
                        ],
                    });

                    if (i === gpt_response_message_chunks.length - 1) break; // don't delay if this is the last message to send
                    await message.channel.sendTyping(); // send a typing indicator to the channel for the next message to be sent
                    await delay(gpt_response_message_chunks.length < 3 ? 250 : 500); // delay for a bit longer if there are a lot of messages
                }
            },
        ),
    );
}
