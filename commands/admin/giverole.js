'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { botHasPermissionsInGuild } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'GIVEROLE',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Gives a role',
    aliases:['giverole'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['MANAGE_ROLES'])) return;
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        const guildMember = await message.guild.members.fetch(user);
        const role_to_add = message.guild.roles.cache.get(command_args[1]) ?? message.mentions.roles.first();
        if (guildMember && role_to_add) {
            const user_is_greater_than_member = message.member.roles.highest.comparePositionTo(guildMember.roles.highest) > 0; // DO NOT TOUCH
            const user_is_greater_than_role_to_add = message.member.roles.highest.comparePositionTo(role_to_add) >= 0; // DO NOT TOUCH
            if (user_is_greater_than_member && user_is_greater_than_role_to_add) {
                guildMember.roles.add(role_to_add).then(guildMember => {
                    message.channel.send(new CustomRichEmbed({
                        title:`Role Manager`,
                        description:`Added ${role_to_add} to ${guildMember.user.tag}`
                    }, message));
                }).catch(console.warn);
            } else {
                message.channel.send(`Something fishy is going on here!`);
                message.channel.send(`You aren't qualified to hand out this role to them.`);
            }
        } else {
            message.channel.send('Please specify a user and role to add');
            message.channel.send(`Example: ${'```'}\n${discord_command} @user#0001 ROLE_HERE${'```'}`);
        }
    },
});
