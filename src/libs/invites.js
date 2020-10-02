'use strict';

const { client } = require('./bot.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Generates an invite to a guild
 * @param {String} guild_id
 * @param {String} invite_reason
 * @returns {Promise<Invite>} an invite or throws if unsuccessful
 */
async function generateInviteToGuild(
    guild_id,
    invite_reason = 'created invite via a command that was used in this server',
) {
    const guild = await client.guilds.fetch(guild_id);
    const invite_channel = guild.channels.cache
        .filter((channel) => {
            const is_text_channel = channel.type === 'text';
            const can_create_invite = channel.permissionsFor(guild.me).has('CREATE_INSTANT_INVITE');
            return is_text_channel && can_create_invite;
        })
        .first();
    if (invite_channel) {
        return await invite_channel.createInvite({ unique: true, maxUses: 5, reason: `${invite_reason}` });
    } else {
        throw new Error(`Unable to create an invite for guild: ${guild_id}!`);
    }
}

module.exports = {
    generateInviteToGuild,
};
