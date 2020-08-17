'use strict';

//#region local dependencies
const bot_config = require('../../config.json');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { botHasPermissionsInGuild } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'UNBAN',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Unbans a user from the guild',
    aliases:['unban'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['BAN_MEMBERS'])) return;
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        if (!user) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user next time!'
            }, message));
            return;
        }
        message.guild.members.unban(user, `@${message.author.tag} used the ${discord_command} command!`).then(unbanned_user => {
            message.channel.send(new CustomRichEmbed({
                title:`@${unbanned_user.tag} (${unbanned_user.id}) has been unbanned!`
            }, message));
        }).catch(() => {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`An error has occurred!`,
                description:`I'm unable to unban that user!`
            }, message));
        });
    },
});
