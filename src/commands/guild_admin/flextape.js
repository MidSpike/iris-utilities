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
    name: 'FLEXTAPE',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'Mutes and deafens a users voice / audio',
    aliases: ['flextape', 'unflextape'],
    cooldown: 2_500,
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MUTE_MEMBERS', 'DEAFEN_MEMBERS'])) return;

        if (!message.member.voice.channel) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'You need to be in a voice channel to use this command!',
                    }, message),
                ],
            }).catch(console.warn);
            return;
        }

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();
        if (!member) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'Provide an @user mention next time!',
                    }, message),
                ],
            }).catch(console.warn);
            return;
        }

        if (!member.voice.channel) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'That user isn\'t in a voice channel right now!',
                    }, message),
                ],
            }).catch(console.warn);
            return;
        }

        if (message.member.voice.channelID !== member.voice.channelID) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        description: 'You need to be in the same voice channel as that user!',
                    }, message),
                ],
            }).catch(console.warn);
            return;
        }

        if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(member.id)) return;
        if (isThisBot(member.id)) return;

        await member.voice.setMute(!member.voice.serverMute).catch(console.warn);
        await member.voice.setDeaf(member.voice.serverMute).catch(console.warn);

        message.channel.send({
            embeds: [
                new CustomRichEmbed({
                    description: `${member.voice.serverMute ? 'Flextaped' : 'Unflextaped'} ${member.user}!`,
                }, message),
            ],
        }).catch(console.warn);
    },
});
