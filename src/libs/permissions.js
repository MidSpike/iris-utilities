'use strict';

const { Discord, client } = require('./discord_client.js');

const bot_config = require('../../config.js');

const { CustomRichEmbed } = require('./CustomRichEmbed.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_common_name = bot_config.COMMON_NAME;

//---------------------------------------------------------------------------------------------------------------//

/**
 * Checks if the bot has the specified permissions in that guild and will auto notify the user if it does not
 * @param {Message} message 
 * @param {Discord.PermissionResolvable[]} required_perms 
 * @returns {Boolean} 
 */
function botHasPermissionsInGuild(message, required_permissions=[Discord.Permissions.FLAGS.ADMINISTRATOR]) {
    if (!message.guild.me.permissions.has(required_permissions)) {
        message.channel.send({
            embed: new CustomRichEmbed({
                color: 0xFF0000,
                title: 'Uh Oh! Something went wrong!',
                description: [
                    `${bot_common_name} is missing the following permission(s):`,
                    `\n${'```'}\n${required_permissions.join('\n')}\n${'```'}`,
                    `You cannot perform this command when I don\'t have teh required permission(s)!`,
                ].join(''),
            }, message),
        });
        return false;
    } else {
        return true;
    }
}

const isWhitelistedControlBot = (bot_id) => bot_config.WHITELISTED_CONTROL_BOTS.includes(bot_id);
const isThisBot = (user_id) => user_id === client.user.id;
const isThisBotsOwner = (user_id) => user_id === bot_config.OWNER_ID;
const isSuperPerson = (user_id) => bot_config.SUPER_PEOPLE.get(user_id) ?? false;
const isSuperPersonAllowed = (super_person, permission_flag) => {
    if (super_person) {
        if (isThisBotsOwner(super_person.id)) {
            return true;
        } else {
            const allowed_all_permissions = super_person?.allowed_permissions?.includes('*') ?? false;
            const allowed_permission_flag = super_person?.allowed_permissions?.includes(permission_flag) ?? false;
            const denied_all_permissions = super_person?.denied_permissions?.includes('*') ?? false;
            const denied_permission_flag = super_person?.denied_permissions?.includes(permission_flag) ?? false;
            const has_all_permissions = allowed_all_permissions && !denied_all_permissions;
            const has_this_permission = allowed_permission_flag && !denied_permission_flag;
            return (has_all_permissions || has_this_permission);
        }
    } else {
        return false;
    }
};

module.exports = {
    botHasPermissionsInGuild,
    isWhitelistedControlBot,
    isThisBot,
    isThisBotsOwner,
    isSuperPerson,
    isSuperPersonAllowed,
};
