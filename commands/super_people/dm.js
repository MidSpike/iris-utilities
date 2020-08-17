'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../src/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../src/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'DM',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'direct message',
    aliases:['dm'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'dm')) {
            sendNotAllowedCommand(message);
            return;
        }
        client.users.cache.get(command_args[0]).createDM().then(dm_channel => {
            dm_channel.send(new CustomRichEmbed({
                author:{
                    iconURL:message.author.displayAvatarURL({dynamic:true}),
                    name:`@${message.author.tag} (${message.author.id})`
                },
                description:`${message.cleanContent.replace(`${discord_command} ${command_args[0]}`, '').trim()}`
            }));
        }).catch(console.warn);
    },
});
