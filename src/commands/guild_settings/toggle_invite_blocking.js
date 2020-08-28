'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'TOGGLE_INVITE_BLOCKING',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'toggles invite blocking',
    aliases:['toggle_invite_blocking'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { guild_config_manipulator } = opts;
        const guild_config = guild_config_manipulator.config;
        const invite_blocking = guild_config.invite_blocking === 'enabled';
        if (invite_blocking === true) {
            message.channel.send(new CustomRichEmbed({
                title:`Invite Blocking: disabled;`,
                description:`Invites sent by members sent in the server will not be automatically deleted.`
            }, message));
            guild_config_manipulator.modifyConfig({
                invite_blocking:'disabled'
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Invite Blocking: enabled;`,
                description:`Invites sent by members sent in the server will be automatically deleted.`
            }, message));
            guild_config_manipulator.modifyConfig({
                invite_blocking:'enabled'
            });
        }
    },
});
