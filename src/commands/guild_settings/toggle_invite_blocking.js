'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TOGGLE_INVITE_BLOCKING',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 18,
    description: 'toggles invite blocking for messages sent by users',
    aliases: ['toggle_invite_blocking'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const invite_blocking = guild_config.invite_blocking === 'enabled';
        if (invite_blocking === true) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: 'Invite Blocking: disabled;',
                    description: 'Invites sent by members sent in this server will not be automatically deleted.',
                }, message),
            });
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                invite_blocking: 'disabled',
            });
        } else {
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: 'Invite Blocking: enabled;',
                    description: 'Invites sent by members sent in this server will be automatically deleted.',
                }, message),
            });
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                invite_blocking: 'enabled',
            });
        }
    },
});
