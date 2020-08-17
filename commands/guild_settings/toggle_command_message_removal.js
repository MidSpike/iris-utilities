'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_COMMAND_MESSAGE_REMOVAL',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles command message removal',
    aliases:['toggle_command_message_removal'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        const command_message_removal = guild_config.command_message_removal === 'enabled';
        if (command_message_removal === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Command Message Removal: disabled;`,
                description:`When a user uses a command, the user's message will not be removed.`
            }, message));
            guild_config_manipulator.modifyConfig({
                command_message_removal:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Command Message Removal: enabled;`,
                description:`When a user uses a command, the user's message will be removed.`
            }, message));
            guild_config_manipulator.modifyConfig({
                command_message_removal:'enabled'
            });
        }
    },
});
