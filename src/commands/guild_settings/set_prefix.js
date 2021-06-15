'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SET_PREFIX',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 2,
    description: 'sets the command prefix for this bot',
    aliases: ['set_prefix'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, command_args, discord_command } = opts;

        if (command_args[0]) {
            if (message.mentions.users.size > 0) {
                message.channel.send({
                    embeds: [
                        new CustomRichEmbed({
                            color:0xFFFF00,
                            title: 'Improper Command Usage!',
                            description: 'My command prefix cannot be a user mention!',
                        }, message),
                    ],
                });
                return;
            }

            const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
            
            const old_command_prefix = guild_config.command_prefix;
            const new_command_prefix = command_args[0].trim().replace(/\s/g, '_').toLowerCase(); // replace whitespaces with underscores and convert to lowercase

            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        title: 'Setting New Command Prefix',
                        description: [
                            `Old Guild Command Prefix:`,
                            `${'```'}\n${old_command_prefix}\n${'```'}`,
                            `New Guild Command Prefix:`,
                            `${'```'}\n${new_command_prefix}\n${'```'}`,
                        ].join('\n'),
                    }, message),
                ],
            });

            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                command_prefix: new_command_prefix,
            });
        } else {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        title: `Well I guess it's time for me to respond to something new!`,
                        description: 'Make sure to enter a new command_prefix after the command next time!',
                        fields: [
                            {
                                name: 'Example Command Usage',
                                value: `${'```'}\n${discord_command} $\n${'```'}`,
                            }, {
                                name: 'Example Description',
                                value: `If you run the above command, I will start responding to commands using \`$\` instead of \`${command_prefix}\``,
                            },
                        ],
                    }),
                ],
            });
        }
    },
});
