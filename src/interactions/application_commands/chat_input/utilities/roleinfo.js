'use strict';

//------------------------------------------------------------//

const moment = require('moment-timezone');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'roleinfo',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'displays information about a guild role',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.ROLE,
                name: 'role',
                description: 'the guild role to lookup',
                required: true,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const bot_message = await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        await interaction.guild.members.fetch(); // cache all members

        const role_id = interaction.options.get('role').value;
        const role = await interaction.guild.roles.fetch(role_id);

        const everyone_permissions = interaction.guild.roles.everyone.permissions.toArray();
        const role_permissions = role.permissions.toArray().filter(permission_flag => !everyone_permissions.includes(permission_flag));

        await bot_message.edit({
            embeds: [
                CustomEmbed.from({
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
                            name: 'Enhanced Permissions',
                            value: `${'```'}\n${role_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : role_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Inherited Permissions',
                            value: `${'```'}\n${everyone_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Color',
                            value: `\`${role.color === 0x000000 ? 'n/a' : role.hexColor}\``,
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
