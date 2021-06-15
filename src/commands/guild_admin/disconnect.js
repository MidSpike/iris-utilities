'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { isThisBot,
        isThisBotsOwner,
        botHasPermissionsInGuild } = require('../../libs/permissions.js');
const { logAdminCommandsToGuild } = require('../../libs/messages.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'DISCONNECT',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'Disconnects a user from their voice channel',
    aliases: ['disconnect'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MOVE_MEMBERS'])) return;

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();
        if (!member) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'Provide a user @mention next time!',
                    }, message),
                ],
            });
            return;
        }

        if (isThisBotsOwner(member.id) || isThisBot(member.id) || member.id === message.author.id) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'You aren\'t allowed to disconnect this user!',
                    }, message),
                ],
            });
            return;
        }

        const member_voice = member.voice;
        const member_voice_channel = member_voice.channel;
        if (!member_voice_channel) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'That user is not in a voice channel!',
                    }, message),
                ],
            });
            return;
        }

        let disconnected_voice_member;
        try {
            disconnected_voice_member = await member_voice.kick(`@${message.author.username} used ${discord_command}`);
        } catch {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFF0000,
                        description: `I was unable to disconnect ${member.user} from **${member_voice_channel.name}**!`,
                    }, message),
                ],
            });
        } finally {
            if (disconnected_voice_member) {
                message.channel.send({
                    embeds: [
                        new CustomRichEmbed({
                            description: `${message.author} disconnected ${member.user} from ${member_voice_channel}!`,
                        }, message),
                    ],
                });
                logAdminCommandsToGuild(message, {
                    embeds: [
                        new CustomRichEmbed({
                            description: `@${message.author.tag} (${message.author.id}) disconnected @${member.user.tag} (${member.user.id}) from the their voice channel!`,
                        }, message),
                    ],
                });
            }
        }
    },
});
