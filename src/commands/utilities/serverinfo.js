'use strict';

//#region local dependencies
const { array_chunks } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'SERVERINFO',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 11,
    description: 'Server Information',
    aliases: ['serverinfo'],
    async executor(Discord, client, message, opts = {}) {
        const { command_args } = opts;
        const guild = client.guilds.cache.get(command_args[0]) ?? message.guild;
        const guild_roles = guild.roles.cache.sort((a, b) => a.position - b.position).map((role) => `<@&${role.id}>`);
        message.channel.send(
            new CustomRichEmbed(
                {
                    title: `Don't go wild with this guild information!`,
                    fields: [
                        { name: 'Discord Id', value: `${guild.id}` },
                        { name: 'Name', value: `${guild.name}` },
                        { name: 'Region', value: `${guild.region}` },
                        { name: 'Owner', value: `<@!${guild.owner.id}>` },
                        { name: 'Bots', value: `${guild.members.cache.filter((m) => m.user.bot).size}` },
                        { name: 'Members', value: `${guild.members.cache.filter((m) => !m.user.bot).size}` },
                        { name: 'Member Verification Level', value: `${guild.verificationLevel}` },
                        { name: 'Explicit Content Filter', value: `${guild.explicitContentFilter}` },
                        ...array_chunks(guild_roles, 32).map((guild_roles_chunk, chunk_index, guild_roles_chunks) => ({
                            name: `Roles ${chunk_index + 1}/${guild_roles_chunks.length}`,
                            value: `${guild_roles_chunk.join(' ')}`,
                        })),
                        {
                            name: 'Features',
                            value: `${guild.features.length > 0 ? `>>> ${guild.features.join('\n')}` : null}`,
                        },
                        { name: 'Verified Guild By Discord', value: `${guild.verified}` },
                        { name: 'Verified Discord Partner', value: `${guild.partnered}` },
                        { name: 'System Channel', value: `${guild.systemChannel ?? null}` },
                        { name: 'Widget Channel', value: `${guild.widgetChannel ?? null}` },
                        { name: 'Official Public Updates Channel', value: `${guild.publicUpdatesChannel ?? null}` },
                        { name: 'Official Rules Channel', value: `${guild.rulesChannel ?? null}` },
                        { name: 'Created On', value: `${guild.createdAt}` },
                        {
                            name: 'Icon',
                            value: `[Link](${guild.iconURL({ format: 'png', size: 1024, dynamic: true })})`,
                        },
                    ],
                    image: guild.iconURL({ format: 'png', size: 1024, dynamic: true }),
                },
                message,
            ),
        );
    },
});
