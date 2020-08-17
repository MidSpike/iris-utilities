'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'FLEXTAPE',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Mutes and deafens a users voice / audio',
    aliases:['flextape'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['MUTE_MEMBERS', 'DEAFEN_MEMBERS'])) return;
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        if (!user) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user next time!'
            }, message));
            return;
        }
        message.guild.members.fetch(user.id).then(async guildMember => {
            if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(guildMember.id)) {return;}
            if (isThisBot(guildMember.id)) {return;}
            if (!guildMember.voice?.channel) {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`That user isn't in a voice channel right now!`
                }, message));
                return;
            }
            await guildMember.voice.setMute(!guildMember.voice.serverMute);
            await guildMember.voice.setDeaf(guildMember.voice.serverMute);
            message.channel.send(new CustomRichEmbed({
                title:`${guildMember.voice.serverMute ? 'Flextaped' : 'Unflextaped'} @${user.tag} (${user.id})`
            }, message));
        }).catch(console.trace);
    },
});
