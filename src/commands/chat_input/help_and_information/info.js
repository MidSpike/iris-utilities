'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../common/app/message');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'info',
    description: 'displays various information about the bot',
    category: ClientCommand.categories.get('HELP_AND_INFORMATION'),
    options: [],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        const bot_application = await discord_client.application.fetch();
        const bot_application_owner = !!bot_application.owner?.owner
                                    ? bot_application.owner.owner
                                    : bot_application.owner;

        const bot_invite_url = discord_client.generateInvite({
            scopes: [ 'applications.commands', 'bot' ],
            permissions: [
                Discord.Permissions.FLAGS.ADMINISTRATOR,
            ],
        });

        const bot_creation_unix_epoch = Math.floor(discord_client.user.createdTimestamp / 1000);

        const distributed_bot_sharding_info = await discord_client.shard.broadcastEval((client) => {
            return [
                `[ shard ${client.shard.ids[0]} ]:`,
                `> - ${client.users.cache.size} user(s)`,
                `> - ${client.guilds.cache.size} guild(s)`,
                `> - ${client.channels.cache.size} channel(s)`,
                `> - ping ${client.ws.ping}ms`,
            ].join('\n');
        });

        await command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    title: `Hello world, I\'m ${discord_client.user.username}`,
                    description: [
                        `I was created by ${bot_application_owner} <t:${bot_creation_unix_epoch}:R> on <t:${bot_creation_unix_epoch}:D>.`,
                    ].join('\n'),
                    fields: [
                        {
                            name: 'About Me',
                            value: `${bot_application.description}`,
                        }, {
                            name: 'Sharding Information',
                            value: [
                                distributed_bot_sharding_info.join('\n\n'),
                            ].join('\n'),
                        },
                    ],
                }),
            ],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Invite Me',
                            url: `${bot_invite_url}`,
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Support Server',
                            url: `https://discord.gg/BXJpS6g`,
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Website',
                            url: `https://iris-utilities.com/`,
                        },
                    ],
                }, {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Donate',
                            url: 'https://github.com/sponsors/MidSpike',
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Source Code',
                            url: `https://github.com/MidSpike/iris-utilities`,
                        }, {
                            type: 2,
                            style: 5,
                            label: 'Privacy Policy',
                            url: `https://iris-utilities.com/pages/privacy.html`,
                        },
                    ],
                },
            ],
        });
    },
});
