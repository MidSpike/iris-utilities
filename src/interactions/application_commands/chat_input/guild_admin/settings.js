'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');
const { GuildConfigsManager } = require('../../../../common/app/guild_configs');

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
                    {
                        required: true,
                        type: Discord.Constants.ApplicationCommandOptionTypes.ROLE,
                        name: 'value',
                        description: 'the role to add to the admins list',
                    },
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
                    {
                        required: true,
                        type: Discord.Constants.ApplicationCommandOptionTypes.ROLE,
                        name: 'value',
                        description: 'the role to remove from the admins list',
                    },
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

module.exports = new ClientInteraction({
    identifier: 'settings',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: settings.map(setting => ({
            type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
            name: setting.name,
            description: 'n/a',
            options: setting.actions.map(action => ({
                type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                name: action.name,
                description: action.description,
                options: action.options,
            })),
        })),
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.GUILD_ADMIN,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('GUILD_ADMIN'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply();

        const setting_name = interaction.options.getSubcommandGroup(true);

        const setting = settings.find(setting => setting.name === setting_name);
        if (!setting) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `The setting \`${setting_name}\` is unavailable.`,
                    }),
                ],
            }).catch(console.warn);
        }

        const setting_action_name = interaction.options.getSubcommand(true);

        const setting_action = setting.actions.find(action => action.name === setting_action_name);
        if (!setting_action) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `The action \`${setting_action_name}\` is unavailable for setting \`${setting_name}\`.`,
                    }),
                ],
            }).catch(console.warn);
        }

        const guild_config = await GuildConfigsManager.fetch(interaction.guildId);

        await setting_action.handler(setting, guild_config, interaction);
    },
});
