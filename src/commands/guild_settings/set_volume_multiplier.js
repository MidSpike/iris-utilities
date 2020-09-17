'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_VOLUME_MULTIPLIER',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'sets volume multiplier',
    aliases:['set_volume_multiplier'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args, guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;

        const guild_volume_manager = client.$.volume_managers.get(message.guild.id);

        if (command_args[0]) {
            const old_volume_multiplier = guild_config.volume_multiplier ?? 1;
            const new_volume_multiplier = !isNaN(parseFloat(command_args[0])) ? parseFloat(command_args[0]) : 1;
            message.channel.send(new CustomRichEmbed({
                title:`Setting New Volume Multiplier`,
                description:`Old Server Volume Multiplier: ${'```'}\n${old_volume_multiplier}\n${'```'}\nNew Server Volume Multiplier: ${'```'}\n${new_volume_multiplier}\n${'```'}`
            }, message));
            guild_config_manipulator.modifyConfig({
                volume_multiplier:new_volume_multiplier
            });
            guild_volume_manager.setVolume(guild_volume_manager.last_volume);
        } else {
            message.channel.send(`Please provide a number after the command next time!`);
            message.channel.send(`Examples:${'```'}\n${discord_command} 0.5\n${'```'}${'```'}\n${discord_command} 1\n${'```'}${'```'}\n${discord_command} 2.0\n${'```'}`);
        }
    },
});
