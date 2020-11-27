'use strict';

//#region local dependencies
const { sendPotentiallyNotSafeForWorkDisclaimer } = require('../../libs/messages.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const { array_random } = require('../../utilities.js');

const roasts_json = require('../../../files/roasts.json');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'ROAST',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Roast people',
    aliases: ['roast'],
    async executor(Discord, client, message, opts={}) {
        const potentially_nsfw_content_is_accepted = await sendPotentiallyNotSafeForWorkDisclaimer(message);
        if (!potentially_nsfw_content_is_accepted) return;

        const roaster = message.author;
        const roastee = message.mentions.users.first() ?? message.author;
        const roast = `${array_random(roasts_json)}`;

        await message.channel.send(`${roaster} is roasting ${roastee}\nHey ${roastee} ${roast}`).catch(console.warn);

        if (roaster?.id === roastee?.id) {
            message.channel.send(`Next time you should try roasting someone besides yourself!`).catch(console.warn);
        }
    },
});
