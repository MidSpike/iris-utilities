'use strict';

//#region local dependencies
const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendConfirmationMessage,
        logAdminCommandsToGuild } = require('../../libs/messages.js');
const { logUserError } = require('../../libs/errors.js');
const { isThisBot,
        isThisBotsOwner,
        isSuperPerson,
        botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'BAN',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: '(un)bans a user in the guild',
    aliases: ['ban', 'unban'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['BAN_MEMBERS'])) return;

        const user_to_ban = client.users.resolve(command_args[0]) ?? message.mentions.users.first();

        if (!user_to_ban) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Provide a @user or user_id next time!',
                fields: [
                    {
                        name: 'Example Usage',
                        value: `${'```'}\n${discord_command} @user#0001\n${'```'}`,
                    }, {
                        name: 'Example Usage',
                        value: `${'```'}\n${discord_command} 000000000000000001\n${'```'}`,
                    },
                ],
            }, message)).catch(console.warn);
            return;
        }

        if (discord_command === `${command_prefix}unban`) {
            message.guild.members.unban(user_to_ban, `@${message.author.tag} used the ${discord_command} command!`).then(unbanned_user => {
                message.channel.send(new CustomRichEmbed({
                    title: `@${unbanned_user.tag} (${unbanned_user.id}) has been unbanned!`,
                }, message));
            }).catch(() => {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'An error has occurred!',
                    description: 'I\'m unable to unban that user!',
                }, message));
            });
        } else { // assuming: discord_command === `${command_prefix}ban`
            function staffMemberCanBanUser(staff_id, user_id) {
                if (isThisBot(user_id)) return false;
                if (isThisBotsOwner(user_id)) return false;
                if (isSuperPerson(user_id) && !isThisBotsOwner(staff_id)) return false;

                if (staff_id === user_id) return false; // Don't allow the staff member to ban themselves

                const staff_member = message.guild.members.resolve(staff_id);
                if (!staff_member) throw new Error('\`staff_id\` must belong to a member in this guild!');

                /* the following people have guaranteed access */
                if (isThisBotsOwner(staff_id)) return true;
                if (isSuperPerson(staff_id)) return true;
                if (message.guild.ownerID === staff_id) return true;

                const staff_member_can_ban = staff_member.hasPermission('BAN_MEMBERS');
                if (!staff_member_can_ban) return false; // They can't ban anyone

                const member_being_banned = message.guild.members.resolve(user_id);
                if (!member_being_banned) return true; // No need to check role hierarchy if the user isn't in this guild

                const staff_member_can_ban_member = staff_member.roles.highest.comparePositionTo(member_being_banned.roles.highest) > 0;
                return staff_member_can_ban_member;
            }

            if (!staffMemberCanBanUser(message.author.id, user_to_ban.id)) {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'You aren\'t allowed to ban this user!',
                }, message)).catch(console.warn);
                return;
            }

            const confirm_embed = new CustomRichEmbed({
                title: `Are you sure you want to ban @${user_to_ban.tag}?`,
            }, message);

            sendConfirmationMessage(message.author.id, message.channel.id, true, confirm_embed, async () => {
                const guild_member_to_ban = message.guild.members.resolve(user_to_ban.id);
                if (guild_member_to_ban?.bannable) {
                    /* the user is in the guild and is bannable */
                    const dm_channel = await user_to_ban.createDM();
                    await dm_channel.send(new CustomRichEmbed({
                        color: 0xFF00FF,
                        title: `You have been banned from ${message.guild.name}`,
                    })).catch(console.warn);

                    await Timer(1000); // Make sure to send the message before banning them
                }

                message.guild.members.ban(user_to_ban.id, {
                    reason: `@${message.author.tag} used ${discord_command}`,
                }).then(() => {
                    message.channel.send(new CustomRichEmbed({
                        title: `@${user_to_ban.tag} has been banned!`,
                    }, message)).catch(console.warn);
                    logAdminCommandsToGuild(message, new CustomRichEmbed({
                        title: `@${message.author.tag} (${message.author.id}) banned @${user_to_ban.tag} (${user_to_ban.id}) from the server!`,
                    }, message));
                }).catch(() => {
                    logUserError(message, error);
                });
            }, () => {});
        }
    },
});
