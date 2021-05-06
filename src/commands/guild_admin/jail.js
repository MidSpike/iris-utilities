'use strict';

//#region dependencies
const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { logUserError } = require('../../libs/errors.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { isThisBot,
        isThisBotsOwner,
        isSuperPerson,
        botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'JAIL',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'allows staff to jail/unjail a user in the guild',
    aliases: ['jail', 'unjail'],
    cooldown: 10_000,
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MANAGE_ROLES', 'MUTE_MEMBERS'])) return;

        const member = message.guild.members.resolve(command_args[0]) ?? message.mentions.members.first();

        if (!member) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Provide an @user next time!',
                description: 'This command can prevent a specified member from typing or speaking in any channel that currently exists!',
                fields: [
                    {
                        name: 'Example (putting someone in the jail)',
                        value: `${'```'}\n${command_prefix}jail @user#0001\n${'```'}`,
                    }, {
                        name: 'Example (removing someone from the jail)',
                        value: `${'```'}\n${command_prefix}unjail @user#0001\n${'```'}`,
                    },
                ],
            }, message)).catch(console.warn);
            return;
        }

        function staffMemberCanJailMember(staff_id, member_id) {
            if (isThisBot(member_id)) return false;
            if (isThisBotsOwner(member_id)) return false;
            if (isSuperPerson(member_id) && !isThisBotsOwner(staff_id)) return false;

            if (staff_id === member_id) return false; // don't allow the staff member to jail themselves

            const staff_member = message.guild.members.resolve(staff_id);
            if (!staff_member) throw new Error('\`staff_id\` must belong to a member in this guild!');

            /* the following people have guaranteed access */
            if (isThisBotsOwner(staff_id)) return true;
            if (isSuperPerson(staff_id)) return true;
            if (message.guild.ownerID === staff_id) return true;

            const staff_member_has_permissions = staff_member.permissions.has([
                Discord.Permissions.FLAGS.MANAGE_CHANNELS,
                Discord.Permissions.FLAGS.MANAGE_MESSAGES,
                Discord.Permissions.FLAGS.MUTE_MEMBERS,
            ]);
            if (!staff_member_has_permissions) return false; // they don't have the required permissions

            const member_being_jailed = message.guild.members.resolve(member_id);

            const staff_member_can_jail_member = staff_member.roles.highest.comparePositionTo(member_being_jailed.roles.highest) > 0;
            return staff_member_can_jail_member;
        }

        if (!staffMemberCanJailMember(message.author.id, member.id)) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                description: `You aren\'t allowed to jail/unjail ${member}!`,
            }, message)).catch(console.warn);
            return;
        }

        if (member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                description: `This command doesn\'t work on members with the \`ADMINISTRATOR\` permission!`,
            }, message)).catch(console.warn);
            return;
        }

        if (discord_command === `${command_prefix}jail`) {
            const bot_message = await message.channel.send(new CustomRichEmbed({
                description: `Adding ${member} to the jail!`,
            }, message)).catch(console.warn);

            for (const channel of message.guild.channels.cache.values()) {
                /* clone the current permissions before locking the permissions with the parent channel */
                const current_channel_permission_overwrites = Array.from(channel.permissionOverwrites.values());

                try {
                    await channel.overwritePermissions([
                        ...current_channel_permission_overwrites,
                        {
                            id: member.id,
                            deny: [
                                'MANAGE_MESSAGES',
                                'SEND_MESSAGES',
                                'ADD_REACTIONS',
                                'ATTACH_FILES',
                                'EMBED_LINKS',
                                'CONNECT',
                                'SPEAK',
                                'STREAM',
                                'USE_VAD',
                                'MOVE_MEMBERS',
                                'MUTE_MEMBERS',
                                'DEAFEN_MEMBERS',
                            ],
                        },
                    ], `Updated channel permissions to jail @${member.user.tag} (${member.user.id})`);
                } catch (error) {
                    logUserError(message, error);
                    break;
                }

                await Timer(100); // prevent api abuse
            }

            bot_message.edit(new CustomRichEmbed({
                description: `Added ${member} to the jail!`,
            }, message)).catch(console.warn);
        } else { // assuming: discord_command === `${command_prefix}unjail`
            const bot_message = await message.channel.send(new CustomRichEmbed({
                description: `Removing ${member} from the jail!`,
            }, message)).catch(console.warn);

            for (const channel of message.guild.channels.cache.values()) {
                /* clone the current permissions before locking the permissions with the parent channel */
                const current_channel_permission_overwrites = Array.from(channel.permissionOverwrites.values());

                try {
                    await channel.overwritePermissions([
                        ...current_channel_permission_overwrites,
                        {
                            id: member.id,
                        },
                    ], `Updated channel permissions to jail @${member.user.tag} (${member.user.id})`);
                } catch (error) {
                    logUserError(message, error);
                    break;
                }

                await Timer(100); // prevent api abuse
            }

            bot_message.edit(new CustomRichEmbed({
                description: `Removed ${member} from the jail!`,
            }, message)).catch(console.warn);
        }
    },
});
