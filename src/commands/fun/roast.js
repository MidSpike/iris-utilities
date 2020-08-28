'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const { array_random } = require('../../utilities.js');

const roasts_json = require('../../../files/roasts.json');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'ROAST',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Roast people',
    aliases:['roast'],
    async executor(Discord, client, message, opts={}) {
        if (!message.channel.nsfw) {
            message.channel.send(new CustomRichEmbed({
                title:'This command requires an NSFW channel!',
                description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
            }, message));
            return;
        }
        const roaster = message.author;
        const roastee = message.mentions.users.first() ?? message.author;
        const roast = `${array_random(roasts_json)}`;
        message.channel.send(`${roaster} is roasting ${roastee}\nHey ${roastee} ${roast}`);
        if (roaster?.id === roastee?.id) {
            message.channel.send(`Next time you should try roasting someone besides yourself!`);
        }
    },
});
