'use strict';

const { client } = require('./bot.js');

//---------------------------------------------------------------------------------------------------------------//

const emoji_guild_id = process.env.BOT_EMOJI_GUILD_ID;

//---------------------------------------------------------------------------------------------------------------//

/** @TODO Find better way to do this */
const zero_to_nine_as_words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

//---------------------------------------------------------------------------------------------------------------//

/**
 * Searches for an emoji located in the Bot's Emoji Server
 * @param {String} custom_emoji_name 
 * @returns {GuildEmoji|undefined} the guild emoji or unicode emoji
 */
function findCustomEmoji(custom_emoji_name) {
    if (typeof custom_emoji_name !== 'string') throw new TypeError('`custom_emoji_name` must be a string!');
    const bot_custom_emojis = client.guilds.cache.get(emoji_guild_id).emojis.cache;
    const bot_emoji = bot_custom_emojis.find(emoji => emoji.name === custom_emoji_name);
    return bot_emoji ?? undefined;
}

/**
 * Converts a number into an emoji from the bots emoji guild
 * @param {Number|String} num can be multiple digits
 * @returns {String} a string of bot number emojis
 */
function constructNumberUsingEmoji(num) {
    if (isNaN(num) && typeof num !== 'string') throw new TypeError('`num` must be a number or a string!');
    const num_as_digits = `${num}`.split('');
    const array_of_emojis = num_as_digits.map((value) => findCustomEmoji(`bot_emoji_${zero_to_nine_as_words[parseInt(value)]}`));
    const constructed_emojis_from_number = array_of_emojis.join('');
    return constructed_emojis_from_number;
}

module.exports = {
    zero_to_nine_as_words,
    findCustomEmoji,
    constructNumberUsingEmoji,
};
