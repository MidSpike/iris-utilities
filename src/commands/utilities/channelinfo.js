'use strict';

//#region dependencies
const moment = require('moment-timezone');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'CHANNELINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 12,
    description: 'displays information about a specified channel',
    aliases: ['channelinfo'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const channel = message.guild.channels.resolve(command_args[0]) ?? message.mentions.channels.first() ?? message.channel;
        if (!channel) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'Uh Oh!',
                        description: 'That was an invalid channel #mention or id!',
                        fields: [
                            {
                                name: 'Example usage:',
                                value: `${'```'}\n${discord_command} #channel\n${'```'}`,
                            },
                        ],
                    }, message),
                ],
            });
            return;
        }

        await channel.fetch(); // cache the channel
        message.channel.send({
            embeds: [
                new CustomRichEmbed({
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
                            value: `\`${channel.viewable ?? 'N/A'}\``,
                            inline: true,
                        }, {
                            name: 'Deletable',
                            value: `\`${channel.deletable ?? 'N/A'}\``,
                            inline: true,
                        }, {
                            name: 'Manageable',
                            value: `\`${channel.manageable ?? 'N/A'}\``,
                            inline: true,
                        },

                        ...(channel.type !== 'voice' ? [
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            },
                        ] : []),

                        ...(channel.type === 'voice' ? [
                            {
                                name: 'Editable',
                                value: `\`${channel.editable ?? 'N/A'}\``,
                                inline: true,
                            }, {
                                name: 'Joinable',
                                value: `\`${channel.joinable}\``,
                                inline: true,
                            }, {
                                name: 'Speakable',
                                value: `\`${channel.speakable}\``,
                                inline: true,
                            }, {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            }, {
                                name: 'Members',
                                value: `${channel.members.size > 15 ? '\`more than 15 people\`' : channel.members.map(member => `${member}`).join(' - ')}`,
                                inline: false,
                            },
                        ] : []),
                    ],
                }, message),
            ],
        });
    },
});
