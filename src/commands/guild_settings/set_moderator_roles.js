'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_MODERATOR_ROLES',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'sets moderator roles',
    aliases:['set_moderator_roles'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, guild_config_manipulator } = opts;
        const message_mentions = message.mentions.roles;
        if (message_mentions.size > 0) {
            message.channel.send(new CustomRichEmbed({
                title:`Setting New Server Moderator Roles`,
                description:`New Server Moderator Roles: ${'```'}\n${message_mentions.map(role => role.name).join('\n')}\n${'```'}`
            }, message));
            guild_config_manipulator.modifyConfig({
                moderator_roles:message_mentions.map(role => role.id)
            });
        } else {
            message.channel.send(`Please provide server moderator roles after the command next time!`);
            message.channel.send(`Example: ${'```'}\n${discord_command} @role1 @role2 @role3\n${'```'}`);
        }
    },
});
