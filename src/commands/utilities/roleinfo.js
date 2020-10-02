'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'ROLEINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 9,
    description: 'Guild Role Information',
    aliases: ['roleinfo'],
    async executor(Discord, client, message, opts = {}) {
        const { discord_command, command_args } = opts;
        const role = message.guild.roles.cache.get(command_args[0]) ?? message.mentions.roles.first();
        if (role) {
            const role_permissions = role.permissions.toArray().join('\n');
            message.channel.send(
                new CustomRichEmbed(
                    {
                        title: `Don't go wild with this role information!`,
                        fields: [
                            { name: 'Discord Id', value: `${role.id}`, inline: true },
                            { name: 'Name', value: `${role.name}`, inline: true },
                            { name: 'Color', value: `${role.hexColor}`, inline: true },
                            { name: 'Position', value: `${role.position}`, inline: true },
                            { name: 'Hoisted', value: `${role.hoist}`, inline: true },
                            { name: 'Managed', value: `${role.managed}`, inline: true },
                            { name: `Mentionable`, value: `${role.mentionable}`, inline: true },
                            { name: `Editable`, value: `${role.editable}`, inline: true },
                            { name: `Bots`, value: `${role.members.filter((m) => m.user.bot).size}`, inline: true },
                            { name: `Members`, value: `${role.members.filter((m) => !m.user.bot).size}`, inline: true },
                            { name: 'Created On', value: `${role.createdAt}` },
                            { name: `Permissions`, value: `${'```'}\n${role_permissions}${'```'}` },
                        ],
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
                        description: 'That was an invalid @role_mention!',
                        fields: [{ name: 'Example usage:', value: `${'```'}\n${discord_command} @role${'```'}` }],
                    },
                    message,
                ),
            );
        }
    },
});
