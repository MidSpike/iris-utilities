'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');


const { CustomEmbed } = require('../../../common/app/message');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');
const { GuildConfigsManager } = require('../../../common/app/guild_configs');

//------------------------------------------------------------//

/**
 * @typedef {'fetch'|'modify'|'reset'} SettingActionName
 * @typedef {{
 *  name: SettingActionName,
 *  description: string,
 *  options: Discord.ApplicationCommandOptionData[],
 *  handler(setting: Setting, command_interaction: Discord.CommandInteraction) => Promise<unknown>,
 * }} SettingAction
 *
 * @typedef {{
 *  name: string,
 *  actions: SettingAction[],
 * }} Setting
 */

//------------------------------------------------------------//

/** @type {Setting[]} */
const settings = [
    {
        name: 'guild_admin_roles',
        actions: [
            {
                name: 'list',
                description: 'lists all guild admin roles',
                options: [],
                async handler(setting, guild_config, command_interaction) {
                    const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

                    command_interaction.followUp({
                        embeds: [
                            new CustomEmbed({
                                title: 'Current guild admin roles',
                                description: guild_admin_role_ids.map(role_id => `<@&${role_id}>`).join('\n'),
                            }),
                        ],
                    }).catch(console.warn);
                },
            }, {
                name: 'add',
                description: 'adds a specified role',
                options: [
                    { required: true, type: 'ROLE', name: 'value', description: 'the role to add to the admins list' },
                ],
                async handler(setting, guild_config, command_interaction) {
                    const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

                    const role_id = command_interaction.options.get('value')?.value;

                    if (guild_admin_role_ids.includes(role_id)) {
                        return command_interaction.followUp({
                            embeds: [
                                new CustomEmbed({
                                    color: 0xFFFF00,
                                    title: 'Role already added',
                                    description: `<@&${role_id}> is already an admin role`,
                                }),
                            ],
                        }).catch(console.warn);
                    }

                    await GuildConfigsManager.update(command_interaction.guildId, {
                        admin_role_ids: [...guild_admin_role_ids, role_id],
                    })

                    await command_interaction.followUp({
                        embeds: [
                            new CustomEmbed({
                                title: 'Added guild admin role',
                                description: `<@&${role_id}>`,
                            }),
                        ],
                    }).catch(console.warn);
                },
            }, {
                name: 'remove',
                description: 'removes a specified role',
                options: [
                    { required: true, type: 'ROLE', name: 'value', description: 'the role to remove from the admins list' },
                ],
                async handler(setting, guild_config, command_interaction) {
                    const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

                    const role_id = command_interaction.options.get('value')?.value;

                    if (guild_admin_role_ids.includes(role_id)) {
                        return command_interaction.followUp({
                            embeds: [
                                new CustomEmbed({
                                    color: 0xFFFF00,
                                    title: 'Role already added',
                                    description: `<@&${role_id}> is already an admin role`,
                                }),
                            ],
                        }).catch(console.warn);
                    }

                    await GuildConfigsManager.update(command_interaction.guildId, {
                        admin_role_ids: [...guild_admin_role_ids, role_id],
                    });

                    await command_interaction.followUp({
                        embeds: [
                            new CustomEmbed({
                                title: 'Added guild admin role',
                                description: `<@&${role_id}>`,
                            }),
                        ],
                    }).catch(console.warn);
                },
            }, {
                name: 'cleanup',
                description: 'removes deleted roles',
                options: [],
                async handler(setting, guild_config, command_interaction) {
                    const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

                    const guild = await command_interaction.client.guilds.fetch(command_interaction.guildId);
                    const guild_role_ids = guild.roles.cache.keys();

                    const existing_role_ids = guild_admin_role_ids.filter(role_id => guild_role_ids.includes(role_id));

                    await GuildConfigsManager.update(command_interaction.guildId, {
                        admin_role_ids: existing_role_ids,
                    });

                    command_interaction.followUp({
                        embeds: [
                            new CustomEmbed({
                                title: 'Cleaned up the guild admins roles',
                                description: existing_role_ids.map(role_id => `<@&${role_id}>`).join('\n'),
                            }),
                        ],
                    }).catch(console.warn);
                },
            },
        ],
    },
];

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'settings',
    description: 'n/a',
    category: ClientCommand.categories.get('GUILD_ADMIN'),
    options: settings.map(setting => ({
        type: 'SUB_COMMAND_GROUP',
        name: setting.name,
        description: 'n/a',
        options: setting.actions.map(action => ({
            type: 'SUB_COMMAND',
            name: action.name,
            description: action.description,
            options: action.options,
        })),
    })),
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        const guild_config = await GuildConfigsManager.fetch(command_interaction.guildId);

        const setting_name = command_interaction.options.getSubcommandGroup(true);
        const setting_action_name = command_interaction.options.getSubcommand(true);

        const setting = settings.find(setting => setting.name === setting_name);
        if (!setting) {
            await command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `The setting \`${setting_name}\` is unavailable.`,
                    }),
                ],
            }).catch(console.warn);
            return;
        }

        const setting_action = setting.actions.find(action => action.name === setting_action_name);
        if (!setting_action) {
            await command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `The action \`${setting_action_name}\` is unavailable for setting \`${setting_name}\`.`,
                    }),
                ],
            }).catch(console.warn);
            return;
        }

        await setting_action.handler(setting, guild_config, command_interaction);
    },
});
