'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { Timer, array_random } = require('../../utilities.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');

const magic8ball_json = require('../../../files/8ball.json');
//#endregion dependencies

const bot_common_name = bot_config.COMMON_NAME;
const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'MAGIC8BALL',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'magic8ball',
    aliases: ['magic8ball'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, clean_command_args } = opts;

        const user_text = clean_command_args.join(' ').trim();

        if (user_text.length < 10) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'That doesn\'t look right!',
                    description: 'Try typing a sentence after the command!',
                    fields: [
                        {
                            name: 'Example Usage',
                            value: `${'```'}\n${discord_command} Is MineCraft an awesome game?\n${'```'}`,
                        },
                    ],
                }, message),
            });
            return;
        }

        const bot_message = await message.channel.send({
            embed: new CustomRichEmbed({
                title: 'Shaking the magic 8 ball...',
                image: `${bot_cdn_url}/man-shaking-8-ball.gif`,
            }, message),
        });

        await Timer(3000); // give the user a chance to view the gif

        await bot_message.edit({
            embed: new CustomRichEmbed({
                thumbnail: `${bot_cdn_url}/magic-8-ball.webp`,
                title: `${bot_common_name} - 8 Ball Wizard`,
                fields: [
                    {
                        name: 'You said',
                        value: `${'```'}\n${user_text}\n${'```'}`,
                    }, {
                        name: 'I think that',
                        value: `${'```'}\n${array_random(magic8ball_json)}\n${'```'}`,
                    },
                ],
            }, message),
        });
    },
});
