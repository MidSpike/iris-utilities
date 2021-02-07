'use strict';

//#region dependencies
const dogeify = require('dogeify-js');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'DOGEIFY',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Translate sentences into Doge-speak -> so sentences. amaze.',
    aliases: ['dogeify'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;

        const user_text = clean_command_args.join(' ');

        if (user_text.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Couldn\'t dogeify:',
                description: 'Try typing a sentence after the command!',
                thumbnail: `${bot_cdn_url}/doge-static.gif`,
            }, message));
        } else {
            const bot_message = await message.channel.send(new CustomRichEmbed({
                title: 'Dogeifying:',
                description: `${'```'}\n${user_text}\n${'```'}`,
                image: `${bot_cdn_url}/doge-animated.gif`,
            }, message)).catch(console.warn);

            const dogeified_text = await dogeify(user_text);

            await Timer(3500);

            bot_message.edit(new CustomRichEmbed({
                title: 'Dogeified',
                description: `${'```'}\n${user_text}\n${'```'}into${'```'}\n${dogeified_text}\n${'```'}`,
                thumbnail: `${bot_cdn_url}/doge-static.jpg`,
            }, message)).catch(console.warn);
        }
    },
});
