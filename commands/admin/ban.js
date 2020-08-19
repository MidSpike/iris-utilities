'use strict';

//#region local dependencies
const bot_config = require('../../config.json');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { generateInviteToGuild } = require('../../src/invites.js');
const { sendConfirmationEmbed, logAdminCommandsToGuild } = require('../../src/messages.js');
const { logUserError } = require('../../src/errors.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner, isSuperPerson } = require('../../src/permissions.js');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;
const bot_appeals_guild_id = process.env.BOT_APPEALS_GUILD_ID;

module.exports = new DisBotCommand({
    name:'BAN',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Bans a user from the guild',
    aliases:['ban'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['BAN_MEMBERS'])) return;

        const user_to_ban = client.users.resolve(command_args[0]) ?? message.mentions.users.first();

        if (!user_to_ban) {
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

        function staffMemberCanBanUser(staff_id, user_id) {
            if (isThisBot(user_id)) return false;
            if (isThisBotsOwner(user_id)) return false;
            if (isSuperPerson(user_id)) return false;

            if (staff_id === user_id) return false; // Don't allow the staff member to ban themselves

            const staff_member = message.guild.members.resolve(staff_id);
            if (!staff_member) throw new Error('`staff_id` must belong to a member in this guild!');

            const staff_member_can_ban = staff_member.hasPermission('BAN_MEMBERS');
            if (!staff_member_can_ban) return false; // They can't ban anyone

            const member_being_banned = message.guild.members.resolve(user_id);
            if (!member_being_banned) return true; // No need to check role hierarchy if the user isn't in this guild

            const staff_member_can_ban_member = staff_member.roles.highest.comparePositionTo(member_being_banned.roles.highest) > 0;
            return staff_member_can_ban_member;
        }

        if (!staffMemberCanBanUser(message.author.id, user_to_ban.id)) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`You aren't allowed to ban this user!`
            }, message)).catch(console.warn);
            return;
        }

        sendConfirmationEmbed(message.author.id, message.channel.id, true, new CustomRichEmbed({title:`Are you sure you want to ban @${user_to_ban.tag}?`}), async () => {
            const guild_member_to_ban = message.guild.members.resolve(user_to_ban.id);
            if (guild_member_to_ban?.bannable) { // The user is in the guild and is bannable
                const dm_channel = await user_to_ban.createDM();
                const appeals_guild_invite = await generateInviteToGuild(bot_appeals_guild_id, `Generated using ${discord_command} in ${message.guild.name} (${message.guild.id})`);

                await dm_channel.send(new CustomRichEmbed({
                    color:0xFF00FF,
                    title:`You have been banned from ${message.guild.name}`,
                    description:[
                        `You may have a second chance via the [${bot_common_name} Appeals Server](${appeals_guild_invite.url})`,
                        `If **${message.guild.name}** has ${bot_common_name} Appeals enabled, then you can send an apology to them using the **${bot_common_name} Appeals Server**.`
                    ].join('\n')
                })).catch(console.warn);

                await Timer(1000); // Make sure to send the message before banning them
            }

            message.guild.members.ban(user_to_ban.id, {
                reason:`@${message.author.tag} used ${discord_command}`
            }).then(() => {
                message.channel.send(new CustomRichEmbed({
                    title:`@${user_to_ban.tag} has been banned!`
                })).catch(console.warn);
                logAdminCommandsToGuild(message, new CustomRichEmbed({
                    title:`@${message.author.tag} (${message.author.id}) banned @${user_to_ban.tag} (${user_to_ban.id}) from the server!`
                }));
            }).catch(() => {
                logUserError(message, error);
            });
        }, () => {});
    },
});
