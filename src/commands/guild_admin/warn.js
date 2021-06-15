'use strict';

//#region dependencies
const moment = require('moment-timezone');

const { pseudoUniqueId } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'WARN',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'Warns a user',
    aliases: ['warn'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const user_warnings = guild_config.user_warnings;

        const warning_id = pseudoUniqueId();
        const warning_member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();
        const warning_reason = command_args.slice(1).join(' ').trim() || 'no reason specified';
        const warning_timestamp = moment();

        if (user_warnings.length >= 100) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        title: 'I\'m getting a bit crowded with all of the warnings!',
                        description: `Please use \`${command_prefix}warnings clear\` to clean it up!`,
                    }, message),
                ],
            });
        }

        if (warning_member) {
            const warning_embed = new CustomRichEmbed({
                color: 0xFF00FF,
                title: `You have been warned by @${message.author.tag} in ${message.guild.name}!`,
                description: `You have been warned for:${'```'}\n${warning_reason}\n${'```'}`,
            });
            await message.channel.send({
                content: `${warning_member}`,
                embeds: [
                    warning_embed,
                ],
            });

            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                user_warnings: [
                    ...user_warnings,
                    {
                        id: `${warning_id}`,
                        user_id: `${warning_member.id}`,
                        staff_id: `${message.author.id}`,
                        reason: `${warning_reason}`,
                        timestamp: `${warning_timestamp}`,
                    },
                ],
            });

            try {
                const dm_channel = await warning_member.user.createDM();
                await dm_channel.send({
                    embeds: [
                        warning_embed,
                    ],
                });
            } catch (error) {
                console.warn(error);
                message.channel.send({
                    embeds: [
                        new CustomRichEmbed({
                            color: 0xFF0000,
                            description: `Failed to send warning to ${warning_member} via DMs!`,
                        }, message),
                    ],
                });
            }
        } else {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'I couldn\'t find that user!',
                        description: 'Make sure to @mention the user when warning them!',
                        fields: [
                            {
                                name: 'Example',
                                value: `${'```'}\n${discord_command} @user#0001 profanity\n${'```'}`,
                            },
                        ],
                    }, message),
                ],
            });
        }
    },
});
