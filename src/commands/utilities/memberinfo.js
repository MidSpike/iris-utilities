'use strict';

//#region local dependencies
const { array_chunks } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'MEMBERINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 10,
    description: 'Guild Member Information',
    aliases: ['memberinfo'],
    async executor(Discord, client, message, opts = {}) {
        const { discord_command, command_args } = opts;
        const user =
            message.guild.members.cache.get(command_args[0]) ?? message.mentions.members.first() ?? message.member;
        if (user) {
            const guildMember = message.guild.members.resolve(user);
            const member_permissions = guildMember.permissions
                .toArray()
                .filter(
                    (permission) =>
                        !new Discord.Permissions(Discord.Permissions.DEFAULT).toArray().includes(permission),
                )
                .join('\n');
            const member_roles = guildMember.roles.cache.map((role) => `${role}`);
            const member_joined_index = Array.from(message.guild.members.cache.values())
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
                .findIndex((m) => m.id === guildMember.id);
            message.channel.send(
                new CustomRichEmbed(
                    {
                        title: `Don't go wild with this user information!`,
                        fields: [
                            { name: 'Discord Id', value: `${guildMember.id}`, inline: true },
                            { name: 'Nickname', value: `${guildMember.nickname || 'N/A'}`, inline: true },
                            { name: 'Display Name', value: `${guildMember.displayName || 'N/A'}`, inline: true },
                            { name: 'Username', value: `${guildMember.user.username || 'N/A'}`, inline: true },
                            {
                                name: 'Discriminator',
                                value: `#${guildMember.user.discriminator || 'N/A'}`,
                                inline: true,
                            },
                            { name: `Permissions`, value: `${'```'}\n${member_permissions}\n${'```'}` },
                            ...array_chunks(
                                member_roles,
                                32,
                            ).map((member_roles_chunk, chunk_index, member_roles_chunks) => ({
                                name: `Roles ${chunk_index + 1}/${member_roles_chunks.length}`,
                                value: `${member_roles_chunk.join(' ')}`,
                            })),
                            { name: `Manageable`, value: `${guildMember.manageable}`, inline: true },
                            { name: `Kickable`, value: `${guildMember.kickable}`, inline: true },
                            { name: `Bannable`, value: `${guildMember.bannable}`, inline: true },
                            { name: 'Joined Position', value: `${member_joined_index + 1}` },
                            { name: 'Joined Server On', value: `${guildMember.joinedAt}` },
                            { name: 'Account Created On', value: `${guildMember.user.createdAt}` },
                            {
                                name: 'Profile Picture',
                                value: `[Link](${guildMember.user.displayAvatarURL({ dynamic: true, size: 1024 })})`,
                            },
                        ],
                        image: guildMember.user.displayAvatarURL({ dynamic: true, size: 1024 }),
                    },
                    message,
                ),
            );
        } else {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        color: 0xffff00,
                        title: 'Uh Oh!',
                        description: 'That was an invalid @user_mention!',
                        fields: [{ name: 'Example usage:', value: `${'```'}\n${discord_command} @user${'```'}` }],
                    },
                    message,
                ),
            );
        }
    },
});
