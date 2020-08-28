'use strict';

//#region local dependencies
const moment = require('moment-timezone');

const { pseudoUniqueId } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'WARN',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Warns a user',
    aliases:['warn'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args, guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        const user_warnings = guild_config.user_warnings;
        const warning_id = pseudoUniqueId();
        const warning_user = client.users.cache.get(command_args[0]) ?? message.mentions.users.first();
        const warning_reason = command_args.slice(1).join(' ');
        const warning_timestamp = moment();
        if (user_warnings.length >= 25) {
            message.channel.send(new CustomRichEmbed({
                title:`I'm getting a bit crowded with the warnings!`,
                description:`Please do \`${command_prefix}warnings clear\` to clean it up!`
            }, message));
        }
        if (warning_user) {
            const warning_message = new CustomRichEmbed({
                color:0xFFFF00,
                title:`You Have Been Warned By @${message.author.tag} In ${message.guild.name}!`,
                description:`${warning_user} you have been warned for:${'```'}\n${warning_reason}\n${'```'}`
            });
            await message.channel.send(warning_message);
            guild_config_manipulator.modifyConfig({
                user_warnings:[
                    ...user_warnings,
                    {
                        id:`${warning_id}`,
                        user_id:`${warning_user.id}`,
                        staff_id:`${message.author.id}`,
                        reason:`${warning_reason}`,
                        timestamp:`${warning_timestamp}`
                    }
                ]
            });
            try {
                const dm_channel = await warning_user.createDM();
                dm_channel.send(warning_message);
            } catch (error) {
                console.warn(error);
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    description:`Failed to DM ${warning_user} the warning!`
                }, message));
            }

        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`I couldn't find that user!`,
                description:'Make sure to @mention the user when warning them!',
                fields:[
                    {name:`Example`, value:`${'```'}\n${discord_command} @user#0001${'```'}`}
                ]
            }, message));
        }
    },
});
