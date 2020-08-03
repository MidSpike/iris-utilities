'use strict';

const nodeEmoji = require('node-emoji');

const { Timer } = require('../utilities.js');

const { Discord, client } = require('../bot.js');

const { findCustomEmoji } = require('./emoji.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Breaks apart a large_message and sends it in chunks to a specified channel
 * @param {String} channel_id 
 * @param {String} large_message 
 * @param {String} code_block_lang 
 * @returns {Promise<Array<Message>>} a promise for an array of discord messages
 */
async function sendLargeMessage(channel_id, large_message, code_block_lang='') {
    let sent_messages = [];
    const message_chunks = `${large_message}`.match(/[^]{1,1500}/g); // Split the message into 1500 character long chunks
    for (const message_chunk of message_chunks) {
        let sent_message = await client.channels.cache.get(channel_id).send(`${'```'}${code_block_lang}\n${message_chunk}\n${'```'}`);
        sent_messages.push(sent_message);
        await Timer(1000);
    }
    return sent_messages;
}

/**
 * Sends an embed with buttons for the user to click on
 * @param {String} confirm_user_id 
 * @param {String} channel_id 
 * @param {Boolean} delete_after_selection 
 * @param {String|MessageEmbed} embed_contents 
 * @param {Function} yes_callback 
 * @param {Function} no_callback 
 */
function sendConfirmationEmbed(confirm_user_id, channel_id, delete_after_selection=true, embed_contents='Default Embed', yes_callback=(discord_embed)=>{}, no_callback=(discord_embed)=>{}) {
    client.channels.cache.get(channel_id).send(embed_contents).then(async discord_embed => {
        if (!discord_embed) {return;}
        const bot_emoji_checkmark = findCustomEmoji('bot_emoji_checkmark');
        const bot_emoji_close = findCustomEmoji('bot_emoji_close');
        await discord_embed.react(bot_emoji_checkmark);
        await discord_embed.react(bot_emoji_close);
        discord_embed.createReactionCollector(filter => true).on('collect', reaction => {
            if (reaction.users.cache.get(confirm_user_id) && reaction.users.cache.filter(user => user.bot === false).size > 0) {
                if (reaction.emoji.name === 'bot_emoji_checkmark') {
                    if (delete_after_selection) discord_embed.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    yes_callback(discord_embed);
                } else if (reaction.emoji.name === 'bot_emoji_close') {
                    if (delete_after_selection) discord_embed.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    no_callback(discord_embed);
                }
            }
        });
    });
}

const options_message_reactions_template = [
    {emoji_name:'bot_emoji_checkmark', cooldown:undefined, callback:(options_message, collected_reaction, user)=>{}},
    {emoji_name:'bot_emoji_close', cooldown:undefined, callback:(options_message, collected_reaction, user)=>{}}
];
/**
 * 
 * @param {String} channel_id 
 * @param {MessageEmbed} embed 
 * @param {options_message_reactions_template} reaction_options 
 * @param {String} confirmation_user_id 
 */
async function sendOptionsMessage(channel_id, embed, reaction_options=options_message_reactions_template, confirmation_user_id=undefined) {
    const options_message = await client.channels.cache.get(channel_id).send(embed);
    const reaction_promises = reaction_options.map(reaction_option => async () => { // This needs to be a synchronous lambda returning an asynchronous lambda
        const reaction_option_emoji = findCustomEmoji(reaction_option.emoji_name) ?? nodeEmoji.get(reaction_option.emoji_name);
        if (!reaction_option_emoji) return;
        if (options_message.deleted) return; // Don't add reactions to deleted messages
        const bot_reaction = await options_message.react(reaction_option_emoji);
        const filter = (user_reaction, user) => {
            const isNotBot = user.bot === false;
            const emojiMatches = bot_reaction.emoji.name === user_reaction.emoji.name;
            const confirmationUserMatches = confirmation_user_id ? confirmation_user_id === user.id : true;
            return (isNotBot && emojiMatches && confirmationUserMatches);
        };
        const cooldown_time_ms = reaction_option.cooldown ?? 1500;
        let last_time_of_action = Date.now() - cooldown_time_ms; // subtract the cooldown so that the button can be pressed immediately after it shows up
        function _isLastTimeOfActionRecent() {
            const recent_time_of_action = Date.now();
            if (recent_time_of_action - last_time_of_action < cooldown_time_ms) {
                last_time_of_action = Date.now();
                return true;
            } else {
                last_time_of_action = Date.now();
                return false;
            }
        }
        options_message.createReactionCollector(filter).on('collect', (collected_reaction, user) => {
            if (_isLastTimeOfActionRecent()) return; // Force the user to wait before clicking again
            reaction_option.callback(options_message, collected_reaction, user);
        });
        return;
    });
    for (let reaction_promise of reaction_promises) {// Execute Each Reaction Sequentially
        await reaction_promise();
    }
    return options_message;
}

/**
 * Removes any reactions created by a user on a specified message
 * @param {Message} message 
 */
function removeUserReactionsFromMessage(message) {
    if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
        message.reactions.cache.forEach(reaction => {
            reaction.users.cache.filter(user => !user.bot).forEach(nonBotUser => {
                reaction.users.remove(nonBotUser);
            });
        });
    }
}

/**
 * Removes a specified message from a specified channel
 * @param {String} channel_id 
 * @param {String} message_id 
 * @returns {Promise<Message>}
 */
async function removeMessageFromChannel(channel_id, message_id) {
    const channel_containing_message = client.channels.cache.get(channel_id);
    if (channel_containing_message) {
        if (!channel_containing_message.guild) {
            throw new Error('Message does not reside in a Guild!');
        } else {
            const recent_messages_in_channel = await channel_containing_message.messages.fetch({limit:100});
            const the_message_to_remove = recent_messages_in_channel.get(message_id);
            const the_removed_message = await the_message_to_remove?.delete({timeout:500});
            return the_removed_message;
        }
    } else {
        throw new Error('Channel not found!');
    }
}

module.exports = {
    sendLargeMessage,
    sendConfirmationEmbed,
    sendOptionsMessage,
    removeUserReactionsFromMessage,
    removeMessageFromChannel,
};