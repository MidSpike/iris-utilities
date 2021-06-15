'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { isSuperPerson,
        isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion dependencies

const super_perms = bot_config.SUPER_PERMS;

module.exports = new DisBotCommand({
    name: 'SUPERPERMISSIONS',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'super permissions',
    aliases: ['superpermissions'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const dm_channel = await message.author.createDM();
        await dm_channel.send({
            embeds: [
                new CustomRichEmbed({
                    title: 'Super Permissions',
                    fields: [
                        {
                            name: 'All Super Permissions',
                            value: `${'```'}\n${super_perms.join('\n')}${'```'}`,
                        }, {
                            name: 'Your Super Permissions',
                            value: `${'```'}\n${super_perms.filter(perm_flag => isSuperPersonAllowed(isSuperPerson(message.author.id), perm_flag)).join('\n')}${'```'}`,
                        },
                    ],
                }, message),
            ],
        });
    },
});
