'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'DEAFEN',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Deafens a users audio',
    aliases:['deafen', 'undeafen'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['DEAFEN_MEMBERS'])) return;
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        if (!user) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user next time!'
            }, message));
            return;
        }
        message.guild.members.fetch(user.id).then(async guildMember => {
            if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(guildMember.id)) return;
            if (isThisBot(guildMember.id)) return;
            if (!guildMember.voice?.channel) {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`That user isn't in a voice channel right now!`
                }, message));
                return;
            }
            await guildMember.voice.setDeaf(!guildMember.voice.serverDeaf);
            message.channel.send(new CustomRichEmbed({
                title:`${guildMember.voice.serverDeaf ? 'Deafened' : 'Undeafened'} @${user.tag} (${user.id})`
            }, message));
        }).catch(console.trace);
    },
});
