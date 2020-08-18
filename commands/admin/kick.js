'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { sendConfirmationEmbed, logAdminCommandsToGuild } = require('../../src/messages.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'KICK',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Kicks a user from the guild',
    aliases:['kick'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['KICK_MEMBERS'])) return;
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
            sendConfirmationEmbed(message.author.id, message.channel.id, true, new CustomRichEmbed({title:`Are you sure you want to kick @${guildMember.user.tag}?`}), () => {
                const _kickMember = () => {
                    guildMember.kick(`@${message.author.username} used ${discord_command}`).then(() => {
                        message.channel.send(new CustomRichEmbed({
                            title:`@${guildMember.user.tag} has been kicked!`
                        }));
                        logAdminCommandsToGuild(message, new CustomRichEmbed({
                            title:`@${message.author.tag} (${message.author.id}) kicked @${guildMember.user.tag} (${guildMember.user.id}) from the server!`
                        }));
                    });
                };
                guildMember.createDM().then(dmChannel => {
                    dmChannel.send(`You have been kicked from ${message.guild.name}`).then(() => {
                        _kickMember();
                    }).catch(() => {// Failed to send dm
                        _kickMember();
                    });
                }).catch(() => {// Failed to create dm channel
                    _kickMember();
                });
            }, () => {});
        }).catch(console.trace);
    },
});
