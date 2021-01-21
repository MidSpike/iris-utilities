'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isThisBotsOwner,
        isSuperPerson,
        isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

const bot_blacklisted_guilds_file = path.join(process.cwd(), process.env.BOT_BLACKLISTED_GUILDS_FILE);
const bot_blacklisted_users_file = path.join(process.cwd(), process.env.BOT_BLACKLISTED_USERS_FILE);

module.exports = new DisBotCommand({
    name: 'BLACKLIST',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'blacklist',
    aliases: ['blacklist'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts = {}) {
        const { discord_command, command_args } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'blacklist')) {
            sendNotAllowedCommand(message);
            return;
        }
        const user = client.users.cache.get(command_args[1]) ?? message.mentions.users.first();
        const guild = client.guilds.cache.get(command_args[1]);
        const blacklist_reason = command_args.slice(2).join(' ') || 'Unknown Reason';
        switch (`${command_args[0]}`.toLowerCase()) {
            case 'user':
                if (!user) return;

                if (isThisBotsOwner(user.id)) {
                    message.channel.send(new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'Nope!',
                        description: 'You are not allowed to blacklist this bot\'s owner.',
                    }, message));
                    return;
                }

                if (isSuperPerson(user.id) && !isThisBotsOwner(message.author.id)) {
                    message.channel.send(new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'Nope!',
                        description: 'Only this bot\'s owner can blacklist Super People.',
                    }, message));
                    return;
                }

                let blacklisted_users = JSON.parse(fs.readFileSync(bot_blacklisted_users_file));
                if (blacklisted_users.map(blacklisted_user => blacklisted_user.id).includes(user.id)) {
                    /* remove user from the blacklist */
                    blacklisted_users = blacklisted_users.filter(blacklisted_user => blacklisted_user.id !== user.id);
                    message.channel.send(new CustomRichEmbed({
                        description: `Removed [${user.tag}] (${user.id}) from blacklist!`,
                    }, message));
                } else {
                    /* add user to the blacklist */
                    blacklisted_users = [
                        ...blacklisted_users,
                        {
                            id: user.id,
                            name: user.tag,
                            reason: blacklist_reason,
                        },
                    ];
                    message.channel.send(new CustomRichEmbed({
                        description: `Blacklisted User [${user.tag}] (${user.id}) for ${blacklist_reason}`,
                    }, message));
                }
                fs.writeFileSync(bot_blacklisted_users_file, JSON.stringify(blacklisted_users, null, 4));
                break;
            case 'guild':
                if (!guild) return;
                let blacklisted_guilds = JSON.parse(fs.readFileSync(bot_blacklisted_guilds_file));
                if (blacklisted_guilds.map(blacklisted_guild => blacklisted_guild.id).includes(guild.id)) {
                    /* remove guild from the blacklist */
                    blacklisted_guilds = blacklisted_guilds.filter(blacklisted_guild => blacklisted_guild.id !== guild.id);
                    message.channel.send(new CustomRichEmbed({
                        description: `Removed [${guild.name}] (${guild.id}) from blacklist!`,
                    }));
                } else {
                    /* add guild to the blacklist */
                    blacklisted_guilds = [
                        ...blacklisted_guilds,
                        {
                            id: guild.id,
                            name: guild.name,
                            reason: blacklist_reason,
                        },
                    ];
                    message.channel.send(new CustomRichEmbed({
                        description: `Blacklisted Guild [${guild.name}] (${guild.id}) for ${blacklist_reason}`,
                    }, message));
                }
                fs.writeFileSync(bot_blacklisted_guilds_file, JSON.stringify(blacklisted_guilds, null, 4));
                break;
            default:
                message.channel.send(new CustomRichEmbed({
                    description: `Command Usage: ${'```'}\n${discord_command} [ user | guild ] ID_HERE${'```'}`,
                }, message));
                break;
        }
    },
});
