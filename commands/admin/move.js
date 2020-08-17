'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'MOVE',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Move a user to a specified channel',
    aliases:['move'],
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
        const voice_channel_to_move_user_to = message.guild.channels.cache.filter(c => c.type === 'voice').get(command_args[1]);
        if (!voice_channel_to_move_user_to) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`That voice channel doesn't exist!`
            }, message));
            return;
        }
        message.guild.members.fetch(user.id).then(guildMember => {
            if (!isThisBotsOwner(message.member.id) && isThisBotsOwner(guildMember.id)) {return;}
            if (isThisBot(guildMember.id)) {return;}
            guildMember.voice.setChannel(voice_channel_to_move_user_to);
        }).catch(console.trace);
    },
});
