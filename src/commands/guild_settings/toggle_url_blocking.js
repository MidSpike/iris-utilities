'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TOGGLE_URL_BLOCKING',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 17,
    description: 'toggles url blocking for messages sent by users',
    aliases: ['toggle_url_blocking'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const url_blocking = guild_config.url_blocking === 'enabled';
        if (url_blocking === true) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        title: 'URL Blocking: disabled;',
                        description: 'URLs sent by members sent in this server will not be automatically deleted.',
                    }, message),
                ],
            });
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                url_blocking: 'disabled',
            });
        } else {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        title: 'URL Blocking: enabled;',
                        description: 'URLs sent by members sent in this server will be automatically deleted.',
                    }, message),
                ],
            });
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                url_blocking: 'enabled',
            });
        }
    },
});
