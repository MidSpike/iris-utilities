'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isThisBotsOwner,
        isSuperPerson,
        isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion dependencies

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

        const blacklist_reason = command_args.slice(2).join(' ') || 'Unknown Reason';
        switch (`${command_args[0]}`.toLowerCase()) {
            case 'user':
                const user = (await client.users.fetch(command_args[1]).catch(() => null)) ?? message.mentions.users.first();
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

                if (client.$.blacklisted_users_manager.configs.has(user.id)) {
                    /* remove user from the blacklist */
                    await client.$.blacklisted_users_manager.removeConfig(user.id);
                    message.channel.send(new CustomRichEmbed({
                        description: `Removed [${user.tag}] (${user.id}) from blacklist!`,
                    }, message));
                } else {
                    /* add user to the blacklist */
                    await client.$.blacklisted_users_manager.updateConfig(user.id, {
                        id: user.id,
                        name: user.tag,
                        reason: blacklist_reason,
                    });
                    message.channel.send(new CustomRichEmbed({
                        description: `Blacklisted User [${user.tag}] (${user.id}) for ${blacklist_reason}`,
                    }, message));
                }

                break;
            case 'guild':
                const guild = client.guilds.resolve(command_args[1]);
                if (!guild) return;

                if (client.$.blacklisted_guilds_manager.configs.has(guild.id)) {
                    /* remove guild from the blacklist */
                    await client.$.blacklisted_users_manager.removeConfig(guild.id);
                    message.channel.send(new CustomRichEmbed({
                        description: `Removed [${guild.name}] (${guild.id}) from blacklist!`,
                    }));
                } else {
                    /* add guild to the blacklist */
                    await client.$.blacklisted_guilds_manager.updateConfig(guild.id, {
                        id: guild.id,
                        name: guild.name,
                        reason: blacklist_reason,
                    });
                    message.channel.send(new CustomRichEmbed({
                        description: `Blacklisted Guild [${guild.name}] (${guild.id}) for ${blacklist_reason}`,
                    }, message));
                }

                break;
            default:
                message.channel.send(new CustomRichEmbed({
                    description: `Command Usage: ${'```'}\n${discord_command} [ user | guild ] ID_HERE${'```'}`,
                }, message));
                break;
        }
    },
});
