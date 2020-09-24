'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_URL_BLOCKING',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles url blocking',
    aliases:['toggle_url_blocking'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const url_blocking = guild_config.url_blocking === 'enabled';
        if (url_blocking === true) {
            message.channel.send(new CustomRichEmbed({
                title:`URL Blocking: disabled;`,
                description:`URLs sent by members sent in the server will not be automatically deleted.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                url_blocking:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`URL Blocking: enabled;`,
                description:`URLs sent by members sent in the server will be automatically deleted.`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                url_blocking:'enabled'
            });
        }
    },
});
