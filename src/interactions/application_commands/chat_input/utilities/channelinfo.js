'use strict';

//------------------------------------------------------------//

const moment = require('moment-timezone');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'channelinfo',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'displays information about a guild channel',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.CHANNEL,
                name: 'channel',
                description: 'the guild channel to lookup',
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

        const channel_id = interaction.options.get('channel').value;
        const channel = await interaction.guild.channels.fetch(channel_id);

        const everyone_permissions = channel.permissionsFor(interaction.guild.roles.everyone.id).toArray();

        await bot_message.edit({
            embeds: [
                CustomEmbed.from({
                    title: 'Don\'t go wild with this channel information!',
                    fields: [
                        {
                            name: 'Name',
                            value: `${'```'}\n${channel.name}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `${'```'}\n${channel.id}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Creation Date',
                            value: `${'```'}\n${moment(channel.createdTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Default Permissions',
                            value: `${'```'}\n${everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Type',
                            value: `\`${channel.type}\``,
                            inline: true,
                        }, {
                            name: 'Position',
                            value: `\`${channel.position}\``,
                            inline: true,
                        },

                        ...(channel.parent ? [
                            {
                                name: 'Synced Permissions',
                                value: `\`${channel.permissionsLocked}\``,
                                inline: true,
                            }, {
                                name: 'Parent Name',
                                value: `\`${channel.parent.name}\``,
                                inline: true,
                            }, {
                                name: 'Parent Snowflake',
                                value: `\`${channel.parent.id}\``,
                                inline: true,
                            },
                        ] : []),

                        {
                            name: 'Viewable',
                            value: `\`${channel.viewable ?? 'n/a'}\``,
                            inline: true,
                        }, {
                            name: 'Deletable',
                            value: `\`${channel.deletable ?? 'n/a'}\``,
                            inline: true,
                        }, {
                            name: 'Manageable',
                            value: `\`${channel.manageable ?? 'n/a'}\``,
                            inline: true,
                        },

                        // eslint-disable-next-line no-negated-condition
                        ...(!channel.isVoice() ? [
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            },
                        ] : []),

                        ...(channel.isVoice() ? [
                            {
                                name: 'Region',
                                value: `\`${channel.rtcRegion ?? 'Automatic'}\``,
                                inline: true,
                            }, {
                                name: 'Joinable',
                                value: `\`${channel.joinable}\``,
                                inline: true,
                            }, {
                                name: 'Speakable',
                                value: `\`${channel.speakable ?? 'n/a'}\``,
                                inline: true,
                            }, {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            }, {
                                name: 'Members',
                                value: `${channel.members.size > 15 ? '\`More than 15 people!\`' : channel.members.map(member => `${member}`).join(' - ')}`,
                                inline: false,
                            },
                        ] : []),
                    ],
                }),
            ],
        });
    },
});
