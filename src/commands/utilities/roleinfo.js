'use strict';

//#region dependencies
const moment = require('moment-timezone');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'ROLEINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 9,
    description: 'displays guild role information',
    aliases: ['roleinfo'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        await message.guild.members.fetch(); // cache all members

        const role = message.guild.roles.cache.get(command_args[0]) ?? message.mentions.roles.first();
        if (role) {
            const everyone_permissions = message.guild.roles.everyone.permissions.toArray();
            const role_permissions = role.permissions.toArray().filter(permission_flag => !everyone_permissions.includes(permission_flag));
            message.channel.send(new CustomRichEmbed({
                title: 'Don\'t go wild with this role information!',
                fields: [
                    {
                        name: 'Name',
                        value: `${'```'}\n${role.name}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Snowflake',
                        value: `${'```'}\n${role.id}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Creation Date',
                        value: `${'```'}\n${moment(role.createdTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Unique Permissions',
                        value: `${'```'}\n${role_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : role_permissions.join('\n')}\n${'```'}`,
                        inline: false,
                    }, {
                        name: 'Inherited Permissions',
                        value: `${'```'}\n${everyone_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : everyone_permissions.join('\n')}\n${'```'}`,
                        inline: false,
                    },

                    {
                        name: 'Color',
                        value: `\`${role.hexColor}\``,
                        inline: true,
                    }, {
                        name: 'Position',
                        value: `\`${role.position}\``,
                        inline: true,
                    }, {
                        name: 'Hoisted',
                        value: `\`${role.hoist}\``,
                        inline: true,
                    }, {
                        name: 'Managed',
                        value: `\`${role.managed}\``,
                        inline: true,
                    }, {
                        name: 'Mentionable',
                        value: `\`${role.mentionable}\``,
                        inline: true,
                    }, {
                        name: 'Editable',
                        value: `\`${role.editable}\``,
                        inline: true,
                    }, {
                        name: 'Bots',
                        value: `\`${role.members.filter(m => m.user.bot).size}\``,
                        inline: true,
                    }, {
                        name: 'Members',
                        value: `\`${role.members.filter(m => !m.user.bot).size}\``,
                        inline: true,
                    }, {
                        name: '\u200b',
                        value: '\u200b',
                        inline: true,
                    },
                ],
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh!',
                description: 'That was an invalid role @mention or id!',
                fields: [
                    {
                        name: 'Example usage:',
                        value: `${'```'}\n${discord_command} @role\n${'```'}`,
                    },
                ],
            }, message));
        }
    },
});
