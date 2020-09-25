'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { logAdminCommandsToGuild } = require('../../libs/messages.js');
const { botHasPermissionsInGuild, isThisBot, isThisBotsOwner } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TIMEOUT',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Puts / Removes users from timeout mode',
    aliases:['timeout', 'untimeout'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        if (!botHasPermissionsInGuild(message, ['MANAGE_MESSAGES'])) return;
        if (command_args[0] === 'list') {
            const users_in_timeout = guild_config.users_in_timeout || [];
            const members_in_timeout = users_in_timeout.map(user_id => client.users.resolve(user_id).tag);
            message.channel.send(new CustomRichEmbed({
                title:'Here are the users in timeout',
                description:`${'```'}\n${members_in_timeout.length > 0 ? members_in_timeout.join('\n') : 'Nobody is in timeout'}${'```'}`
            }, message));
        } else {
            const user = client.users.resolve(command_args[0]) ?? message.mentions.users.first();
            if (!user) {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:'Improper Command Usage',
                    description:'Make sure to mention the member that you wish to put into timeout.',
                    fields:[
                        {name:'Information', value:[
                            'Putting users in timeout means that their messages sent within the server, will be deleted immediately.',
                            'Timeouts are indefinite, meaning that you must manually remove someone from timeout.'
                        ].join('\n')},
                        {name:`Example`, value:`The following will place / remove someone from timeout${'```'}\n${discord_command} @user#0001${'```'}`},
                        {name:`Example`, value:`The following will show the users in timeout${'```'}\n${discord_command} list${'```'}`}
                    ]
                }, message));
                return;
            }
            message.guild.members.fetch(user.id).then(async guildMember => {
                if (isThisBotsOwner(guildMember.id) || isThisBot(guildMember.id)) {
                    message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Woah buddy!',
                        description:`You are not allowed put that user into timeout!`
                    }, message));
                    return;
                }
                if (guildMember.id === message.author.id) {
                    message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Woah buddy!',
                        description:`You dont want to put yourself into timeout!`
                    }, message));
                    return;
                }

                const users_in_timeout = guild_config.users_in_timeout;
                await client.$.guild_configs_manager.updateConfig(message.guild.id, {
                    users_in_timeout:(users_in_timeout.includes(guildMember.id) ? [...users_in_timeout.filter(user_id => user_id !== guildMember.id)] : [...users_in_timeout, guildMember.id])
                });

                const updated_guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

                if (updated_guild_config.users_in_timeout.includes(guildMember.id)) {
                    message.channel.send(new CustomRichEmbed({
                        title:`@${guildMember.user.tag} has been put into timeout!`,
                        description:`Do this command again to remove them from timeout.`
                    }));
                    logAdminCommandsToGuild(message, new CustomRichEmbed({
                        title:`@${message.author.tag} (${message.author.id}) put @${guildMember.user.tag} into timeout!`
                    }));
                } else {
                    message.channel.send(new CustomRichEmbed({
                        title:`@${guildMember.user.tag} has been removed from timeout!`
                    }));
                    logAdminCommandsToGuild(message, new CustomRichEmbed({
                        title:`@${message.author.tag} (${message.author.id}) removed @${guildMember.user.tag} from timeout!`
                    }));
                }
            }).catch(console.trace);
        }
    },
});
