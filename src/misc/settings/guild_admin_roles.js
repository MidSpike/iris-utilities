'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../common/app/message');
const { GuildConfigsManager } = require('../../common/app/guild_configs');

//------------------------------------------------------------//

/**
 * @typedef {{
 *  name: string,
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

module.exports = {
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
                        CustomEmbed.from({
                            title: 'Current guild admin roles',
                            description: guild_admin_role_ids.length > 0? guild_admin_role_ids.map(role_id => `<@&${role_id}>`).join('\n'): 'No guild admin roles exist yet!',
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'add',
            description: 'adds a specified role to the admins list',
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
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
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
                        CustomEmbed.from({
                            title: 'Added guild admin role',
                            description: `<@&${role_id}>`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'remove',
            description: 'removes a specified role from the admins list',
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
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
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
                        CustomEmbed.from({
                            title: 'Added guild admin role',
                            description: `<@&${role_id}>`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'reset',
            description: 'resets back to default',
            options: [],
            async handler(setting, guild_config, command_interaction) {

                await GuildConfigsManager.update(command_interaction.guildId, {
                    admin_role_ids: [],
                });

                command_interaction.followUp({
                    embeds: [
                        CustomEmbed.from({
                            title: 'Reset the guild admin roles',
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'cleanup',
            description: 'removes any deleted roles',
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
                        CustomEmbed.from({
                            title: 'Cleaned up the guild admin roles',
                        }),
                    ],
                }).catch(console.warn);
            },
        },
    ],
};
