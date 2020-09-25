'use strict';

//#region local dependencies
const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendConfirmationEmbed, logAdminCommandsToGuild } = require('../../libs/messages.js');
const { logUserError } = require('../../libs/errors.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner, isSuperPerson } = require('../../libs/permissions.js');
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

        const member_to_kick = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();

        if (!member_to_kick) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user or user_id next time!',
                fields:[
                    {name:'Example Usage', value:`${'```'}\n${discord_command} @user#0001\n${'```'}`},
                    {name:'Example Usage', value:`${'```'}\n${discord_command} 000000000000000001\n${'```'}`},
                ]
            }, message)).catch(console.warn);
            return;
        }

        function staffMemberCanKickMember(staff_id, member_id) {
            if (isThisBot(member_id)) return false;
            if (isThisBotsOwner(member_id)) return false;
            if (isSuperPerson(member_id)) return false;

            if (staff_id === member_id) return false; // don't allow the staff member to kick themselves

            const staff_member = message.guild.members.resolve(staff_id);
            if (!staff_member) throw new Error('`staff_id` must belong to a member in this guild!');

            /* the following people have guaranteed access */
            if (isThisBotsOwner(staff_id)) return true;
            if (isSuperPerson(staff_id)) return true;
            if (message.guild.ownerID === staff_id) return true;

            const staff_member_can_kick = staff_member.hasPermission('KICK_MEMBERS');
            if (!staff_member_can_kick) return false; // they can't kick anyone

            const member_being_kicked = message.guild.members.resolve(member_id);

            const staff_member_can_kick_member = staff_member.roles.highest.comparePositionTo(member_being_kicked.roles.highest) > 0;
            return staff_member_can_kick_member;
        }

        if (!staffMemberCanKickMember(message.author.id, member_to_kick.id)) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`You aren't allowed to kick this member!`
            }, message)).catch(console.warn);
            return;
        }

        const confirm_embed = new CustomRichEmbed({
            title:`Are you sure you want to kick @${member_to_kick.tag}?`
        }, message);

        sendConfirmationEmbed(message.author.id, message.channel.id, true, confirm_embed, async () => {
            const guild_member_to_ban = message.guild.members.resolve(member_to_kick.id);
            if (guild_member_to_ban?.bannable) { // The user is in the guild and is bannable
                const dm_channel = await member_to_kick.createDM();

                await dm_channel.send(new CustomRichEmbed({
                    color:0xFF00FF,
                    title:`You have been kicked from ${message.guild.name}`
                })).catch(console.warn);

                await Timer(1000); // Make sure to send the message before banning them
            }

            member_to_kick.kick(`@${message.author.tag} used ${discord_command}`).then(() => {
                message.channel.send(new CustomRichEmbed({
                    title:`@${member_to_kick.tag} has been kicked!`
                }, message)).catch(console.warn);
                logAdminCommandsToGuild(message, new CustomRichEmbed({
                    title:`@${message.author.tag} (${message.author.id}) kicked @${member_to_kick.tag} (${member_to_kick.id}) from the server!`
                }));
            }).catch(() => {
                logUserError(message, error);
            });
        }, () => {});
    },
});
