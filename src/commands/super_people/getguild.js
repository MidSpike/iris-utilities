'use strict';

//#region local dependencies
const path = require('path');
const moment = require('moment-timezone');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand, sendLargeMessage, sendConfirmationMessage } = require('../../libs/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

const bot_command_log_file = path.join(process.cwd(), process.env.BOT_COMMAND_LOG_FILE);

module.exports = new DisBotCommand({
    name:'GETGUILD',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'gets guild',
    aliases:['getguild'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'get_guild')) {
            sendNotAllowedCommand(message);
            return;
        }
        const guild = client.guilds.cache.get(command_args[1]) ?? message.guild;
        switch (`${command_args[0]}`.toLowerCase()) {
            case 'roles':
                message.channel.send(`Here are the guild roles for: ${guild.id}`);
                const sorted_guild_roles = guild.roles.cache.sort((a, b) => b.position - a.position);
                sendLargeMessage(message.channel.id, sorted_guild_roles.map(role => `(${role.id}) (${role.position}) ${role.name}`).join('\n'));
            break;
            case 'invites':
                guild.fetchInvites().then(invites => {
                    if (invites.size && invites.size > 0) {
                        message.channel.send(`Here are the guild invites for: ${guild.id}`);
                        sendLargeMessage(message.channel.id, invites.map(invite => `(${invite.code}) https://discord.gg/${invite.code}`).join('\n'));
                    } else {
                        message.channel.send(`Couldn't find any invites for ${guild.name} (${guild.id})`);
                    }
                }).catch(console.warn);
            break;
            case 'channels':
                message.channel.send(`Here are the guild channels for: ${guild.id}`);
                sendLargeMessage(message.channel.id, guild.channels.cache.map(channel => `(${channel.id}) [${channel.type}] ${channel.name}`).join('\n'));
            break;
            case 'managers':
                message.channel.send(`Here are the guild managers for: ${guild.id}`);
                const guild_managers = guild.members.cache.filter(m => !m.user.bot && m.hasPermission(['MANAGE_GUILD']));
                const sorted_guild_managers = guild_managers.sort((a, b) => b.roles.highest.position - a.roles.highest.position);
                sendLargeMessage(message.channel.id, sorted_guild_managers.map(member => `(${member.id}) ${member.user.tag}`).join('\n'));
            break;
            case 'members':
                const guild_members = guild.members.cache.filter(m => !m.user.bot);
                function _output_members() {
                    message.channel.send(`Here are the guild members for: ${guild.id}`);
                    const sorted_guild_members = guild_members.sort((a, b) => b.roles.highest.position - a.roles.highest.position)
                    sendLargeMessage(message.channel.id, sorted_guild_members.map(member => `(${member.id}) ${member.user.tag}`).join('\n'));
                }
                if (guild_members.size >= 100) {
                    sendConfirmationMessage(message.author.id, message.channel.id, true, new CustomRichEmbed({
                        title:'There are a lot of members in that guild!',
                        description:`Do you wish to print out ${guild_members.size} members?`
                    }, message), () => {
                        _output_members();
                    });
                } else {
                    _output_members();
                }
            break;
            case 'bots':
                const guild_bots = guild.members.cache.filter(m => m.user.bot);
                function _output_bots() {
                    message.channel.send(`Here are the guild bots for: ${guild.id}`);
                    const sorted_guild_bots = guild_bots.sort((a, b) => b.roles.highest.position - a.roles.highest.position);
                    sendLargeMessage(message.channel.id, sorted_guild_bots.map(member => `(${member.id}) ${member.user.tag}`).join('\n'));
                }
                if (guild_bots.size >= 100) {
                    sendConfirmationMessage(message.author.id, message.channel.id, true, new CustomRichEmbed({
                        title:'There are a lot of bots in that guild!',
                        description:`Do you wish to print out ${guild_bots.size} bots?`
                    }, message), () => {
                        _output_bots();
                    });
                } else {
                    _output_bots();
                }
            break;
            case 'config':
                const _guild_config = await message.client.$.guild_configs_manager.fetchConfig(guild.id);
                sendLargeMessage(message.channel.id, `${JSON.stringify(_guild_config, null, 2)}`, 'json');
            break;
            case 'usage':
                function getGuildCommandsUsage(guild_id) {
                    const current_command_logs_file = bot_command_log_file.replace('#{date}', `${moment().format(`YYYY-MM`)}`);
                    const current_command_logs = require(current_command_logs_file);
                    const guild_command_usage = current_command_logs.filter(command_log_entry => command_log_entry.guild.indexOf(guild_id) > -1).length;
                    return guild_command_usage;
                }
                message.channel.send(`Command usage for \`${guild.name}\` is \`${getGuildCommandsUsage(guild.id)}\` entered this month!`);
            break;
            default:
                message.channel.send(`Usage: ${'```'}\n${discord_command} [ roles | invites | channels | managers | members | bots | usage | config ] GUILD_ID_HERE${'```'}`);
            break;
        }
    },
});
