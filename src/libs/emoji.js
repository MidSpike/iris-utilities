'use strict';

const { Discord, client } = require('./discord_client.js');

//---------------------------------------------------------------------------------------------------------------//

const emoji_guild_id = process.env.BOT_EMOJI_GUILD_ID;

//---------------------------------------------------------------------------------------------------------------//

/** @TODO find a better way to do this */
const zero_to_nine_as_words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

//---------------------------------------------------------------------------------------------------------------//

/**
 * Searches for an emoji located in the Bot's Emoji Server
 * @param {String} custom_emoji_name 
 * @returns {Promise<GuildEmoji|undefined>} the guild emoji or unicode emoji
 */
async function findCustomEmoji(custom_emoji_name) {
    if (typeof custom_emoji_name !== 'string') throw new TypeError('\`custom_emoji_name\` must be a string!');

    const emoji_guild_shard = Discord.ShardClientUtil.shardIDForGuildID(emoji_guild_id, client.shard.count);
    const emoji_guild_emojis = await client.shard.broadcastEval(`this.guilds.resolve('${emoji_guild_id}')?.emojis?.cache`, emoji_guild_shard);
    const custom_emoji = emoji_guild_emojis.find(emoji => emoji.name === custom_emoji_name);

    return custom_emoji ? `<${custom_emoji.animated ? 'a' : ''}:${custom_emoji.name}:${custom_emoji.id}>` : undefined;
}

/**
 * Converts a number into an emoji from the bots emoji guild
 * @param {Number|String} num can be multiple digits
 * @returns {Promise<String>} a string of bot number emojis
 */
async function constructNumberUsingEmoji(num) {
    if (!['string', 'number'].includes(typeof num)) throw new TypeError('\`num\` must be a number / string!');

    const num_as_digits = `${num}`.split('');

    const array_of_emojis = await Promise.all(
        num_as_digits.map(async (value) => 
            await findCustomEmoji(`bot_emoji_${zero_to_nine_as_words[parseInt(value)]}`)
        )
    );

    const constructed_emojis_from_number = array_of_emojis.join('');

    return constructed_emojis_from_number;
}

module.exports = {
    zero_to_nine_as_words,
    findCustomEmoji,
    constructNumberUsingEmoji,
};
