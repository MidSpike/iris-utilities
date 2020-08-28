'use strict';

//#region local dependencies
const bot_config = require('../../../config.json');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

const super_perms = bot_config.super_perms;

module.exports = new DisBotCommand({
    name:'SUPERPERMISSIONS',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'super permissions',
    aliases:['superpermissions'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        message.author.createDM().then(dm_channel => {
            dm_channel.send(new CustomRichEmbed({
                title:`Super Permissions`,
                description:`Here is a list of super permissions you might have!`,
                fields:[
                    {name:'All Super Permissions', value:`${'```'}\n${super_perms.join('\n')}${'```'}`},
                    {name:'Your Super Permissions', value:`${'```'}\n${super_perms.filter(perm_flag => isSuperPersonAllowed(isSuperPerson(message.author.id), perm_flag)).join('\n')}${'```'}`}
                ]
            }, message));
        }).catch(console.warn);
    },
});
