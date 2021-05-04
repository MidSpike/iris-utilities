'use strict';

//#region dependencies
const moment = require('moment-timezone');

const { array_chunks } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'MEMBERINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 10,
    description: 'Displays information about a specified guild member',
    aliases: ['memberinfo', 'userinfo'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first() ?? message.member;
        if (member) {
            const everyone_permissions = message.guild.roles.everyone.permissions.toArray();
            const member_permissions = member.permissions.toArray().filter(permission_flag => !everyone_permissions.includes(permission_flag));

            const member_user_flags = member.user.flags?.toArray() ?? [];

            const member_roles = member.roles.cache.sort((a, b) => a.position - b.position).map(role => `${role}`);

            message.channel.send(new CustomRichEmbed({
                title: 'Don\'t go wild with this user information!',
                fields: [
                    {
                        name: 'Snowflake',
                        value: `${'```'}\n${member.id}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Username',
                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                        inline: false,
                    },

                    ...(member.nickname ? [
                        {
                            name: 'Nickname',
                            value: `${'```'}\n${member.nickname}\n${'```'}`,
                            inline: false,
                        },
                    ] : []),

                    {
                        name: 'Account Creation Date',
                        value: `${'```'}\n${moment(member.user.createdTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Member Joined Date',
                        value: `${'```'}\n${moment(member.joinedTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Permissions',
                        value: `${'```'}\n${member_permissions.length > 1 ? (member_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : member_permissions.join('\n')) : 'NO_PERMISSIONS_BEYOND_EVERYONE'}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Flags',
                        value: `${'```'}\n${member_user_flags.length > 1 ? member_user_flags.join('\n') : 'NO_FLAGS'}\n${'```'}`,
                        inline: false,
                    },

                    {
                        name: 'Manageable',
                        value: `\`${member.manageable}\``,
                        inline: true,
                    }, {
                        name: 'Kickable',
                        value: `\`${member.kickable}\``,
                        inline: true,
                    }, {
                        name: 'Bannable',
                        value: `\`${member.bannable}\``,
                        inline: true,
                    },

                    ...array_chunks(member_roles, 32).map((member_roles_chunk, chunk_index, member_roles_chunks) => ({
                        name: `Roles ${chunk_index+1}/${member_roles_chunks.length}`,
                        value: `${member_roles_chunk.join(' - ')}`,
                        inline: false,
                    })),
                ],
                image: member.user.displayAvatarURL({dynamic: true, size: 1024}),
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh!',
                description: 'That was an invalid member @mention or id!',
                fields: [
                    {
                        name: 'Example usage:',
                        value: `${'```'}\n${discord_command} @member\n${'```'}`
                    },
                ],
            }, message));
        }
    },
});
