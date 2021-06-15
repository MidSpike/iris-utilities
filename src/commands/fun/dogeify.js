'use strict';

//#region dependencies
const dogeify = require('dogeify-js');

const { Timer } = require('../../utilities.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'DOGEIFY',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Translate sentences into doge-speak -> so sentences. amaze.',
    aliases: ['dogeify'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;

        const user_text = clean_command_args.join(' ').trim();

        if (user_text.length < 10) {
            await message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'I wasn\'t able to dogeify that!',
                        description: 'Try typing a sentence after the command!',
                        thumbnail: `${bot_cdn_url}/doge-static.gif`,
                    }, message),
                ],
            });
            return;
        }

        const bot_message = await message.channel.send({
            embeds: [
                new CustomRichEmbed({
                    title: 'I\'m dogeifying your text!',
                    fields: [
                        {
                            name: 'Original',
                            value: `${'```'}\n${user_text}\n${'```'}`,
                        },
                    ],
                    thumbnail: `${bot_cdn_url}/doge-animated.gif`,
                }, message),
            ],
        }).catch(console.warn);

        const dogeified_text = await dogeify(user_text);

        await Timer(3000); // give the user a chance to view the gif

        await bot_message.edit({
            embeds: [
                new CustomRichEmbed({
                    title: 'I dogeified your text!',
                    fields: [
                        {
                            name: 'Original',
                            value: `${'```'}\n${user_text}\n${'```'}`,
                        }, {
                            name: 'Dogeified',
                            value: `${'```'}\n${dogeified_text}\n${'```'}`,
                        },
                    ],
                    thumbnail: `${bot_cdn_url}/doge-static.jpg`,
                }, message),
            ],
        }).catch(console.warn);
    },
});
