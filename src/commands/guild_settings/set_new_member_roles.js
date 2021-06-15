'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SET_NEW_MEMBER_ROLES',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 6,
    description: 'allows you to configure what roles should be given to new members',
    aliases: ['set_new_member_roles'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts = {}) {
        const { discord_command, command_args } = opts;

        const { new_member_roles: initial_new_member_roles } = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        const potential_roles_from_mentions = Array.from(message.mentions.roles.values());
        const potential_roles_from_ids = command_args.slice(1);
        const potential_roles = potential_roles_from_mentions.length > 0 ? potential_roles_from_mentions : potential_roles_from_ids;

        const roles = potential_roles.map(potential_role => 
            message.guild.roles.resolve(potential_role)
        ).filter(value => !!value); // remove falsy values from the array

        switch (`${command_args[0]}`.toLowerCase()) {
            case 'add':
                if (roles.length > 0) {
                    await client.$.guild_configs_manager.updateConfig(message.guild.id, {
                        new_member_roles: Array.from(new Set([
                            ...initial_new_member_roles,
                            ...roles.map(role => role.id),
                        ])),
                    });
                    const { new_member_roles: updated_new_member_roles } = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
                    message.channel.send({
                        embeds: [
                            new CustomRichEmbed({
                                color: 0x00FF00,
                                title: 'Added auto-roles for new members',
                                fields: [
                                    {
                                        name: 'Old auto-roles',
                                        value: initial_new_member_roles.map(role_id => 
                                            message.guild.roles.resolve(role_id) ?? `@deleted_role (${role_id})`
                                        ).join('\n') || 'n/a',
                                    }, {
                                        name: 'New auto-roles',
                                        value: updated_new_member_roles.map(role_id => 
                                            message.guild.roles.resolve(role_id) ?? `@deleted_role (${role_id})`
                                        ).join('\n') || 'n/a',
                                    },
                                ],
                            }, message),
                        ],
                    });
                } else {
                    message.channel.send({
                        embeds: [
                            new CustomRichEmbed({
                                color: 0xFFFF00,
                                title: 'Please specify roles after this command!',
                                description: `Run \`${discord_command}\` to see an example.`,
                            }, message),
                        ],
                    });
                }
                break;
            case 'remove':
                if (roles.length > 0) {
                    await client.$.guild_configs_manager.updateConfig(message.guild.id, {
                        new_member_roles: Array.from(new Set(initial_new_member_roles.filter(role_id => !roles.map(role => role.id).includes(role_id)))),
                    });
                    const { new_member_roles: updated_new_member_roles } = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
                    message.channel.send({
                        embeds: [
                            new CustomRichEmbed({
                                color: 0x00FF00,
                                title: 'Removed auto-roles for new members',
                                fields: [
                                    {
                                        name: 'Old auto-roles',
                                        value: initial_new_member_roles.map(role_id => 
                                            message.guild.roles.resolve(role_id) ?? `@deleted_role (${role_id})`
                                        ).join('\n') || 'n/a',
                                    }, {
                                        name: 'New auto-roles',
                                        value: updated_new_member_roles.map(role_id => 
                                            message.guild.roles.resolve(role_id) ?? `@deleted_role (${role_id})`
                                        ).join('\n') || 'n/a',
                                    },
                                ],
                            }, message),
                        ],
                    });
                } else {
                    message.channel.send({
                        embeds: [
                            new CustomRichEmbed({
                                color: 0xFFFF00,
                                title: 'Please specify roles after this command!',
                                description: `Run \`${discord_command}\` to see an example.`,
                            }, message),
                        ],
                    });
                }
                break;
            case 'reset':
                await client.$.guild_configs_manager.updateConfig(message.guild.id, {
                    new_member_roles: [],
                });
                message.channel.send({
                    embeds: [
                        new CustomRichEmbed({
                            color: 0x00FF00,
                            title: 'Success: removed all auto-roles for new members!',
                        }, message),
                    ],
                });
                break;
            default:
                message.channel.send({
                    embeds: [
                        new CustomRichEmbed({
                            fields: [
                                {
                                    name: 'Adding automatic roles for new members',
                                    value: [
                                        `${'```'}\n${discord_command} add @role1 @role2 ...\n${'```'}`,
                                        `${'```'}\n${discord_command} add role_id_1 role_id_2 ...\n${'```'}`,
                                    ].join(''),
                                }, {
                                    name: 'Removing automatic roles for new members',
                                    value: [
                                        `${'```'}\n${discord_command} remove @role1 @role2 ...\n${'```'}`,
                                        `${'```'}\n${discord_command} remove role_id_1 role_id_2 ...\n${'```'}`,
                                    ].join(''),
                                }, {
                                    name: 'Resetting automatic roles for new members',
                                    value: `${'```'}\n${discord_command} reset\n${'```'}`,
                                }, {
                                    name: 'Information',
                                    value: 'When using automatic roles, make sure that I have the \`MANAGE_ROLES\` permission and that my highest role is placed above the roles you want me to add to new members.',
                                },
                            ],
                        }, message),
                    ],
                });
                break;
        }
    },
});
