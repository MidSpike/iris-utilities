'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { isThisBot,
        isThisBotsOwner,
        botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'MOVE',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'moves a specified user to a specified voice channel',
    aliases: ['move'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MOVE_MEMBERS'])) return;

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();
        if (!member) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Provide an @user mention next time!',
            }, message)).catch(console.warn);
            return;
        }

        if (!member.voice?.channelID) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'That user is not in a voice channel!',
            }, message)).catch(console.warn);
            return;
        }

        const voice_channel_id = command_args[1];
        if (!voice_channel_id) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'You must specify a voice channel id after the user mention!',
                description: `Example:${'```'}\n${discord_command} @user 100000000000000000\n${'```'}`,
            }, message));
            return;
        }

        const voice_channel = message.guild.channels.cache.filter(channel => channel.type === 'voice').get(voice_channel_id);
        if (!voice_channel) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'That voice channel doesn\'t exist!',
            }, message));
            return;
        }

        /* don't allow other users to move this bot's owner */
        if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(member.id)) return;

        /* don't allow users to move this bot */
        if (isThisBot(member.id)) return;

        member.voice.setChannel(voice_channel).then(() => {
            message.channel.send(new CustomRichEmbed({
                description: `Moved ${member} to ${voice_channel.name}.`,
            }, message)).catch(console.warn);
        }).catch(() => {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                description: `I was unable to move ${member} to ${voice_channel.name}.`,
            }, message)).catch(console.warn);
        });
    },
});
