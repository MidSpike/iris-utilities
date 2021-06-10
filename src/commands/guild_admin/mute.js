'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { isThisBot,
        isThisBotsOwner,
        botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'MUTE',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'Mutes a users voice',
    aliases: ['mute', 'unmute'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MUTE_MEMBERS'])) return;

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();
        if (!member) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Provide a valid @user mention next time!',
                }, message),
            });
            return;
        }

        if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(member.id)) return;
        if (isThisBot(member.id)) return;

        if (!member.voice?.channel) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'That user isn\'t in a voice channel right now!',
                }, message),
            });
            return;
        }

        await member.voice.setMute(!member.voice.serverMute);

        message.channel.send({
            embed: new CustomRichEmbed({
                title: `${member.voice.serverMute ? 'Muted' : 'Unmuted'} @${member.user.tag} (${member.user.id})`,
            }, message),
        });
    },
});
