'use strict';

//#region local dependencies
const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner, isSuperPerson } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'JAIL',
    category:`${DisBotCommander.categories.HIDDEN}`,
    description:'(un)jails a user in the guild',
    aliases:['jail', 'unjail'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;
        if (!botHasPermissionsInGuild(message, ['MANAGE_CHANNELS', 'MANAGE_ROLES', 'MUTE_MEMBERS'])) return;

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();

        if (!member) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide an @user next time!'
            }, message));
            return;
        }

        function staffMemberCanJailMember(staff_id, member_id) {
            if (isThisBot(member_id)) return false;
            if (isThisBotsOwner(member_id)) return false;
            if (isSuperPerson(member_id)) return false;

            if (staff_id === member_id) return false; // don't allow the staff member to kick themselves

            const staff_member = message.guild.members.resolve(staff_id);
            if (!staff_member) throw new Error('`staff_id` must belong to a member in this guild!');

            const staff_member_can_kick = staff_member.hasPermission('MANAGE_CHANNELS', 'MUTE_MEMBERS');
            if (!staff_member_can_kick) return false; // they can't kick anyone

            const member_being_kicked = message.guild.members.resolve(member_id);

            const staff_member_can_kick_member = staff_member.roles.highest.comparePositionTo(member_being_kicked.roles.highest) > 0;
            return staff_member_can_kick_member;
        }

        if (!staffMemberCanJailMember(message.author.id, member.id)) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`You aren't allowed to jail/unjail this member!`
            }, message)).catch(console.warn);
            return;
        }

        if (member.hasPermission(['ADMINISTRATOR'])) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`This command doesn't work on members with the \`ADMINISTRATOR\` permission!`
            }, message));
        }

        if (discord_command === `${command_prefix}jail`) {
            const bot_message = await message.channel.send(new CustomRichEmbed({
                description:`Adding ${member} to the jail!`
            }, message));
            for (const channel of message.guild.channels.cache.values()) {
                await channel.createOverwrite(member, {
                    'MANAGE_MESSAGES': false,
                    'SEND_MESSAGES': false,
                    'ADD_REACTIONS': false,
                    'ATTACH_FILES': false,
                    'EMBED_LINKS': false,
                    'CONNECT': false,
                    'SPEAK': false,
                    'STREAM': false,
                    'USE_VAD': false,
                    'MOVE_MEMBERS': false,
                    'MUTE_MEMBERS': false,
                    'DEAFEN_MEMBERS': false,
                }).catch(console.warn);
                await Timer(100);
            }
            bot_message.edit(new CustomRichEmbed({
                description:`Added ${member} to the jail!`
            }, message));
        } else { // assuming: discord_command === `${command_prefix}unjail`
            const bot_message = await message.channel.send(new CustomRichEmbed({
                description:`Removing ${member} from the jail!`
            }, message));
            for (const channel of message.guild.channels.cache.values()) {
                await channel.createOverwrite(member, {
                    'MANAGE_MESSAGES': null,
                    'SEND_MESSAGES': null,
                    'ADD_REACTIONS': null,
                    'ATTACH_FILES': null,
                    'EMBED_LINKS': null,
                    'CONNECT': null,
                    'SPEAK': null,
                    'STREAM': null,
                    'USE_VAD': null,
                    'MOVE_MEMBERS': null,
                    'MUTE_MEMBERS': null,
                    'DEAFEN_MEMBERS': null,
                }).catch(console.warn);
                await Timer(100);
            }
            bot_message.edit(new CustomRichEmbed({
                description:`Removed ${member} from the jail!`
            }, message));
        }
    },
});
