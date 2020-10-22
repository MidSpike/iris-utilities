'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { isThisBot,
        isThisBotsOwner,
        botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'AFK',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'moves a specified user to the guild\'s afk voice channel',
    aliases: ['afk'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        /**
         * Example Command Usage:
         * command_name member_id_or_mention
         */

        const { command_args } = opts;

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

        const afk_voice_channel_to_move_user_to = message.guild.afkChannelID;
        if (!afk_voice_channel_to_move_user_to) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'This server does not have an AFK channel to send the user to!',
            }, message)).catch(console.warn);
            return;
        }

        /* don't allow other users to move this bot's owner */
        if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(member.id)) return;

        /* don't allow users to move this bot */
        if (isThisBot(member.id)) return;

        /* move the specified guild member to the guild afk channel */
        member.voice.setChannel(afk_voice_channel_to_move_user_to).then(() => {
            message.channel.send(new CustomRichEmbed({
                description: `Moved ${member} to this guild\'s AFK voice channel.`,
            }, message)).catch(console.warn);
        }).catch(() => {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                description: `I was unable to move ${member} to this guild\'s AFK voice channel.`,
            }, message)).catch(console.warn);
        });
    },
});
