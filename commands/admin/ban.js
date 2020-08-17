'use strict';

//#region local dependencies
const bot_config = require('../../config.json');

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
        const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
        if (!user) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Provide a @user next time!'
            }, message));
            return;
        }
        if (isThisBotsOwner(user.id) || isThisBot(user.id) || user.id === message.author.id) {return;}
        sendConfirmationEmbed(message.author.id, message.channel.id, true, new CustomRichEmbed({title:`Are you sure you want to ban @${user.tag}?`}), async () => {
            function _banMember() {
                let user_was_banned = true;
                try {
                    if (isSuperPerson(user.id)) throw new Error(`Unable to ban a Super Person!`);
                    message.guild.members.ban(user.id, {reason:`@${message.author.tag} used ${discord_command}`});
                } catch (error) {
                    user_was_banned = false;
                    logUserError(message, error);
                } finally {
                    if (!user_was_banned) return;
                    message.channel.send(new CustomRichEmbed({
                        title:`@${user.tag} has been banned!`
                    }));
                    logAdminCommandsToGuild(message, new CustomRichEmbed({
                        title:`@${message.author.tag} (${message.author.id}) banned @${user.tag} (${user.id}) from the server!`
                    }));
                }
            }
            try {
                if (!message.guild.members.resolve(user.id)) throw new Error('User does not exist in Guild!');
                const dm_channel = await user.createDM();
                const appeals_guild_invite = await generateInviteToGuild(bot_appeals_guild_id, `Generated using ${discord_command} in ${message.guild.name} (${message.guild.id})`);
                dm_channel.send(new CustomRichEmbed({
                    color:0xFF00FF,
                    title:`You have been banned from ${message.guild.name}`,
                    description:[
                        `You may have a second chance via the [${bot_common_name} Appeals Server](${appeals_guild_invite.url})`,
                        `If **${message.guild.name}** has ${bot_common_name} Appeals enabled, then you can send an apology to them using the **${bot_common_name} Appeals Server**.`
                    ].join('\n')
                }));
            } catch (error) {
                console.trace(error);
            } finally {
                _banMember();
            }
        }, () => {});
    },
});
