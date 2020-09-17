'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_VOLUME_MAXIMUM',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'sets volume maximum',
    aliases:['set_volume_maximum'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args, guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;

        const guild_volume_manager = client.$.volume_managers.get(message.guild.id);

        if (command_args[0]) {
            const old_volume_maximum = guild_config.volume_maximum ?? 100;
            const new_volume_maximum = !isNaN(parseFloat(command_args[0])) ? parseFloat(command_args[0]) : 100;
            if (new_volume_maximum < 100) {
                message.channel.send(`Please provide a number greater than or equal to \`100\` next time!`);
                return;
            }
            message.channel.send(new CustomRichEmbed({
                title:`Setting New Maximum Volume`,
                description:`Old Server Maximum Volume: ${'```'}\n${old_volume_maximum}\n${'```'}\nNew Server Maximum Volume: ${'```'}\n${new_volume_maximum}\n${'```'}`
            }, message));
            guild_config_manipulator.modifyConfig({
                volume_maximum:new_volume_maximum
            });
            guild_volume_manager.setVolume(guild_volume_manager.last_volume);
        } else {
            message.channel.send(`Please provide a number after the command next time!`);
            message.channel.send(`Examples:${'```'}\n${discord_command} 100\n${'```'}${'```'}\n${discord_command} 250\n${'```'}${'```'}\n${discord_command} 500\n${'```'}`);
        }
    },
});
