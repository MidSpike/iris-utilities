//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { DiscordClientWithSharding } from '@root/types';

import crypto from 'node:crypto';

import axios from 'axios';

import * as Discord from 'discord.js';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

import { CustomEmbed } from '@root/common/app/message';

import { delay, stringChunksPreserveWords } from '@root/common/lib/utilities';

//------------------------------------------------------------//

export default async function chatArtificialIntelligenceHandler(
    discord_client: DiscordClientWithSharding,
    message: Discord.Message<true>,
): Promise<void> {
    if (!message.inGuild()) return; // don't respond to direct messages
    if (!message.deletable) return; // unable to delete this message
    if (!message.member) return; // unable to get the member

    if (message.author.bot) return; // don't respond to bots
    if (message.author.system) return; // don't respond to system messages

    /* fetch the guild config */
    const guild_config = await GuildConfigsManager.fetch(message.guild.id);
    if (!guild_config.chat_ai_channel_ids) return;

    /* check if the message was sent in the chat ai channel */
    if (!guild_config.chat_ai_channel_ids.includes(message.channel.id)) return;

    await message.channel.sendTyping(); // send typing indicator

    await delay(1000); // wait 1 second to properly load messages

    const messages_collection = await message.channel.messages.fetch({
        limit: 4, // increasing this number will increase the accuracy of responses at the cost of api tokens
        before: message.id,
    });

    // convert the collection to an array
    const messages = messages_collection.map((msg) => msg);

    // add the most recent message to the array
    messages.push(message);

    // sort the messages from oldest to newest
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const filtered_messages = messages.filter((msg) => {
        if (msg.author.bot && msg.author.id !== discord_client.user.id) return false;
        if (msg.content.length < 1) return false;
        if (msg.content.length > 256) return false;

        return true;
    });

    const formatted_messages = filtered_messages.map(
        (msg) => ({
            role: msg.author.id === discord_client.user.id ? 'assistant' : 'user',
            content: [
                msg.content,
            ].join('\n'),
        })
    );

    const gpt_messages = [
        {
            role: 'system',
            content: 'You are I.R.I.S. Utilities, converse like a human, keep your response short and don\'t use emojis.',
        },
        ...formatted_messages,
    ];

    console.log({
        gpt_messages,
    });

    // apply a simple hash to the user id to mask the raw user id from openai
    const hashed_user_id = crypto.createHash('sha256').update(message.author.id).digest('hex');

    const gpt_response = await axios({
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        data: {
            'model': 'gpt-3.5-turbo',
            'messages': gpt_messages,
            'max_tokens': 512, // prevent lengthy responses from being generated
            'user': hashed_user_id,
        },
        validateStatus: (status) => true,
    });

    if (gpt_response.status !== 200) {
        console.warn('Failed to generate a response from GPT:', {
            'response': gpt_response,
            'response_data': gpt_response.data,
        });

        return;
    }

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

    const gpt_response_data = gpt_response.data as GPTResponseData;
    const gpt_response_message = gpt_response_data?.choices?.[0]?.message?.content ?? 'Failed to generate a response.';
    const gpt_response_total_tokens = gpt_response_data?.usage?.total_tokens ?? 0;

    const gpt_response_message_chunks = stringChunksPreserveWords(gpt_response_message, 1000);

    for (let i = 0; i < gpt_response_message_chunks.length; i++) {
        const gpt_response_message_chunk = gpt_response_message_chunks[i];

        await message.channel.send({
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

        await delay(250); // wait a bit to prevent rate limiting
    }
}
