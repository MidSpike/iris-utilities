'use strict';

//------------------------------------------------------------//

const moment = require('moment-timezone');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../common/app/message');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'roleinfo',
    description: 'displays various information about a guild role',
    category: ClientCommand.categories.get('UTILITIES'),
    options: [
        {
            type: 'ROLE',
            name: 'role',
            description: 'the guild role to lookup',
            required: true,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        const bot_message = await command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: 'Loading...',
                }),
            ],
        });

        await command_interaction.guild.members.fetch(); // cache all members

        const role_id = command_interaction.options.get('role').value;
        const role = await command_interaction.guild.roles.fetch(role_id);

        const everyone_permissions = command_interaction.guild.roles.everyone.permissions.toArray();
        const role_permissions = role.permissions.toArray().filter(permission_flag => !everyone_permissions.includes(permission_flag));

        await bot_message.edit({
            embeds: [
                new CustomEmbed({
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
                            value: `${'```'}\n${role_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : role_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Inherited Permissions',
                            value: `${'```'}\n${everyone_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
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
                }),
            ],
        });
    },
});
