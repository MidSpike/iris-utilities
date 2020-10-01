'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'AFK',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Moves a user to the afk channel',
    aliases:['afk'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['MOVE_MEMBERS'])) return;
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        if (!user) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user next time!'
            }, message));
            return;
        }
        const afk_voice_channel_to_move_user_to = message.guild.afkChannelID;
        if (!afk_voice_channel_to_move_user_to) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`This server does not have an AFK channel!`
            }, message));
            return;
        }
        message.guild.members.fetch(user.id).then(guildMember => {
            if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(guildMember.id)) return;
            if (isThisBot(guildMember.id)) return;
            guildMember.voice.setChannel(afk_voice_channel_to_move_user_to);
        }).catch(console.trace);
    },
});
