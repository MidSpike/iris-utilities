'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TAKEROLE',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'takes a specified role from a specified member',
    aliases: ['takerole'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MANAGE_ROLES'])) return;

        const member = message.guild.members.cache.get(command_args[0]) ?? message.mentions.members.first();
        const role = message.guild.roles.cache.get(command_args[1]) ?? message.mentions.roles.first();

        if (member && role) {
            const staff_highest_role_is_greater_than_member_highest_role = message.member.roles.highest.comparePositionTo(member.roles.highest) > 0;
            const staff_highest_role_is_greater_than_role = message.member.roles.highest.comparePositionTo(role) > 0;

            if (staff_highest_role_is_greater_than_member_highest_role && staff_highest_role_is_greater_than_role) {
                member.roles.remove(role).then(() => {
                    message.channel.send({
                        embed: new CustomRichEmbed({
                            title: 'Role Manager',
                            description: `Removed ${role.name} from ${member}!`,
                        }, message),
                    }).catch(console.warn);
                }).catch((error) => {
                    logUserError(message, error);
                });
            } else {
                message.channel.send([
                    'Something fishy is going on here!',
                    'You aren\'t allowed to take this role from that user.',
                ].join('\n'));
            }
        } else {
            message.channel.send([
                'Please specify a user and a role for this command!',
                `Example: ${'```'}\n${discord_command} @user#0001 ROLE_HERE\n${'```'}`,
            ].join('\n'));
        }
    },
});
