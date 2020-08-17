'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_URL_BLOCKING',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles url blocking',
    aliases:['toggle_url_blocking'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        const url_blocking = guild_config.url_blocking === 'enabled';
        if (url_blocking === true) {
            message.channel.send(new CustomRichEmbed({
                title:`URL Blocking: disabled;`,
                description:`URLs sent by members sent in the server will not be automatically deleted.`
            }, message));
            guild_config_manipulator.modifyConfig({
                url_blocking:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`URL Blocking: enabled;`,
                description:`URLs sent by members sent in the server will be automatically deleted.`
            }, message));
            guild_config_manipulator.modifyConfig({
                url_blocking:'enabled'
            });
        }
    },
});
