'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_CLEAR_MESSAGE',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles clear message',
    aliases:['toggle_clear_message'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const clear_message = guild_config.clear_message === 'enabled';

        if (clear_message === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Clear Message: disabled;`,
                description:`\`${command_prefix}clear\` will not say when it has been used.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                clear_message:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Clear Message: enabled;`,
                description:`\`${command_prefix}clear\` will say when it has been used.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                clear_message:'enabled'
            });
        }
    },
});
