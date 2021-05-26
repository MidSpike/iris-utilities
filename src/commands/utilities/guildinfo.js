'use strict';

//#region dependencies
const moment = require('moment-timezone');

const { array_chunks } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'GUILDINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 11,
    description: 'displays information about a specified guild',
    aliases: ['guildinfo', 'serverinfo'],
    cooldown: 10_000,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild = message.guild;

        const guild_members = await guild.members.fetch(); // cache all members

        const guild_emojis = guild.emojis.cache.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1).map((guild_emoji) => `${guild_emoji}`);
        const guild_emoji_chunks = array_chunks(guild_emojis, 5);

        const guild_roles = guild.roles.cache.sort((a, b) => a.position - b.position).map(role => `${role}`);
        const guild_role_chunks = array_chunks(guild_roles, 25);

        switch (`${command_args[0]}`.toLowerCase()) {
            case 'roles':
                await message.channel.send(new CustomRichEmbed({
                    fields: [
                        {
                            name: 'Name',
                            value: `${'```'}\n${guild.name}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `${'```'}\n${guild.id}\n${'```'}`,
                            inline: false,
                        },

                        ...guild_role_chunks.map((guild_roles_chunk, chunk_index, guild_roles_chunks) => ({
                            name: `Roles ${chunk_index+1}/${guild_roles_chunks.length}`,
                            value: `${guild_roles_chunk.join(' - ')}`,
                        })),
                    ],
                }, message));
                break;
            case 'emojis':
                await message.channel.send(new CustomRichEmbed({
                    fields: [
                        {
                            name: 'Name',
                            value: `${'```'}\n${guild.name}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `${'```'}\n${guild.id}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Emojis',
                            value: guild_emoji_chunks.map((guild_emoji_chunk) => guild_emoji_chunk.join('')).join('\n'),
                            inline: false,
                        },
                    ],
                }, message));
                break;
            default:
                await message.channel.send(new CustomRichEmbed({
                    title: 'Don\'t go wild with this guild information!',
                    fields: [
                        {
                            name: 'Name',
                            value: `${'```'}\n${guild.name}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `${'```'}\n${guild.id}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Creation Date',
                            value: `${'```'}\n${moment(guild.createdTimestamp).tz('America/New_York').format('YYYY[-]MM[-]DD hh:mm A [GMT]ZZ')}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Owner',
                            value: `<@!${guild.owner?.id}>`,
                            inline: true,
                        }, {
                            name: 'Region',
                            value: `\`${guild.region}\``,
                            inline: true,
                        }, {
                            name: 'Verified By Discord',
                            value: `\`${guild.verified}\``,
                            inline: true,
                        }, {
                            name: 'Partnered With Discord',
                            value: `\`${guild.partnered}\``,
                            inline: true,
                        }, {
                            name: 'Verification Level',
                            value: `\`${guild.verificationLevel}\``,
                            inline: true,
                        }, {
                            name: 'Explicit Content Filter',
                            value: `\`${guild.explicitContentFilter}\``,
                            inline: true,
                        }, {
                            name: 'Bots',
                            value: `\`${guild_members.filter(m => m.user.bot).size}\``,
                            inline: true,
                        }, {
                            name: 'Members',
                            value: `\`${guild_members.filter(m => !m.user.bot).size}\``,
                            inline: true,
                        }, {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        },

                        ...[
                            (guild.rulesChannel ? {
                                name: 'Rules Channel',
                                value: `${guild.rulesChannel}`,
                                inline: false,
                            } : undefined),
                            (guild.systemChannel ? {
                                name: 'System Channel',
                                value: `${guild.systemChannel}`,
                                inline: false,
                            } : undefined),
                            (guild.publicUpdatesChannel ? {
                                name: 'Public Updates Channel',
                                value: `${guild.publicUpdatesChannel}`,
                                inline: false,
                            } : undefined),
                            (guild.widgetChannel ? {
                                name: 'Widget Channel',
                                value: `${guild.widgetChannel}`,
                                inline: false,
                            } : undefined),
                        ].filter(item => !!item),

                        {
                            name: 'Features',
                            value: `${guild.features.length > 0 ? guild.features.map(feature_flag => `- \`${feature_flag}\``).join('\n') : '\`n/a\`'}`,
                        },

                        {
                            name: 'Additional Information',
                            value: [
                                'You can do the following to see additional info:',
                                '\`\`\`',
                                `${discord_command} emojis`,
                                '\`\`\`\`\`\`',
                                `${discord_command} roles`,
                                '\`\`\`',
                            ].join('\n'),
                        },
                    ],
                    image: guild.iconURL({ format: 'png', size: 1024, dynamic: true }),
                }, message));
                break;
        }
    },
});
