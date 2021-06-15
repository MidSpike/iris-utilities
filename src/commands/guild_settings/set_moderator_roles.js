'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SET_MODERATOR_ROLES',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 5,
    description: 'allows you to configure the recognized moderator roles',
    aliases: ['set_moderator_roles'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;

        const message_mentions = message.mentions.roles;

        if (message_mentions.size > 0) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        title: 'Setting New Server Moderator Roles',
                        description: `New Server Moderator Roles: ${'```'}\n${message_mentions.map(role => role.name).join('\n')}\n${'```'}`,
                    }, message),
                ],
            });
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                moderator_roles: message_mentions.map(role => role.id),
            });
        } else {
            message.channel.send('Please provide server moderator roles after the command next time!');
            message.channel.send(`Example: ${'```'}\n${discord_command} @role1 @role2 @role3\n${'```'}`);
        }
    },
});
