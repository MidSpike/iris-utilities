'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { logAdminCommandsToGuild } = require('../../src/messages.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'DISCONNECT',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Disconnects a user from their voice channel',
    aliases:['disconnect'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['MOVE_MEMBERS'])) return;
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        if (!user) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user next time!'
            }, message));
            return;
        }
        message.guild.members.fetch(user.id).then(guildMember => {
            if (isThisBotsOwner(guildMember.id) || isThisBot(guildMember.id) || guildMember.id === message.author.id) return;
            if (!guildMember.voice) return;
            guildMember.voice.kick(`@${message.author.username} used ${discord_command}`).then(() => {
                message.channel.send(new CustomRichEmbed({
                    title:`@${guildMember.user.tag} has been disconnected!`
                }));
                logAdminCommandsToGuild(message, new CustomRichEmbed({
                    title:`@${message.author.tag} (${message.author.id}) disconnected @${guildMember.user.tag} (${guildMember.user.id}) from the their voice channel!`
                }));
            });
        }).catch(console.trace);
    },
});
