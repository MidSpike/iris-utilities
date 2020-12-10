'use strict';

//#region local dependencies
const { array_chunks } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'MEMBERINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 10,
    description: 'Guild Member Information',
    aliases: ['memberinfo'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const default_discord_perms = new Discord.Permissions(Discord.Permissions.DEFAULT);

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first() ?? message.member;
        if (member) {
            const member_permissions = member.permissions.toArray().filter(permission => !default_discord_perms.toArray().includes(permission)).join('\n');
            const member_roles = member.roles.cache.map(role => `${role}`);
            message.channel.send(new CustomRichEmbed({
                title: 'Don\'t go wild with this user information!',
                fields: [
                    {
                        name: 'Discord Id',
                        value: `${member.id}`,
                        inline: true,
                    }, {
                        name: 'Nickname',
                        value: `${member.nickname || 'N/A'}`,
                        inline: true,
                    }, {
                        name: 'Username',
                        value: `${member.user.username || 'N/A'}`,
                        inline: true,
                    }, {
                        name: 'Discriminator',
                        value: `#${member.user.discriminator || 'N/A'}`,
                        inline: true,
                    }, {
                        name: 'Permissions',
                        value: `${'```'}\n${member_permissions}\n${'```'}`
                    }, ...array_chunks(member_roles, 32).map((member_roles_chunk, chunk_index, member_roles_chunks) => ({
                        name: `Roles ${chunk_index+1}/${member_roles_chunks.length}`,
                        value: `${member_roles_chunk.join(' ')}`,
                    })), {
                        name: 'Manageable',
                        value: `${member.manageable}`,
                        inline: true,
                    }, {
                        name: 'Kickable',
                        value: `${member.kickable}`,
                        inline: true,
                    }, {
                        name: 'Bannable',
                        value: `${member.bannable}`,
                        inline: true,
                    }, {
                        name: 'Joined Server On',
                        value: `${member.joinedAt}`,
                    }, {
                        name: 'Account Created On',
                        value: `${member.user.createdAt}`,
                    },
                    // {
                    //     name: 'Profile Picture',
                    //     value: `[Link](${member.user.displayAvatarURL({dynamic: true, size: 1024})})`,
                    // },
                ],
                image: member.user.displayAvatarURL({dynamic: true, size: 1024}),
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh!',
                description: 'That was an invalid @user_mention!',
                fields: [
                    {
                        name: 'Example usage:',
                        value: `${'```'}\n${discord_command} @user${'```'}`
                    },
                ],
            }, message));
        }
    },
});
