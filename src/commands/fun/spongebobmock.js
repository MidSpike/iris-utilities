'use strict';

//#region dependencies
const SpongeBobMock = require('spmock');

const { Timer } = require('../../utilities.js');

const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'SPONGEBOBMOCK',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'mock text like the \'mocking spongebob\' meme',
    aliases: ['spongebobmock', 'spmock', 'mock'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, clean_command_args } = opts;

        const user_text = clean_command_args.join(' ').trim();

        if (user_text.length < 10) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'I wasn\'t able to mock that:',
                description: 'Try typing a sentence after the command!',
                fields: [
                    {
                        name: 'Example Usage',
                        value: `${discord_command} Spongebob is going to mock me!`,
                    },
                ],
            }, message));
            return;
        }

        const bot_message = await message.channel.send(new CustomRichEmbed({
            title: 'Used SpongeBob Mock',
            fields: [
                {
                    name: 'Telling SpongeBob to mock',
                    value: `${'```'}\n${user_text}\n${'```'}`,
                },
            ],
            image: `${bot_cdn_url}/spongebob-mocking-animated.gif`,
        }, message));

        const spmock_text = SpongeBobMock.spmock(user_text);

        await Timer(3000); // give the user a chance to view the gif

        await bot_message.edit(new CustomRichEmbed({
            title: 'Used SpongeBob Mock',
            fields: [
                {
                    name: 'You told SpongeBob to mock',
                    value: `${'```'}\n${user_text}\n${'```'}`,
                }, {
                    name: 'He came up with',
                    value: `${'```'}\n${spmock_text}\n${'```'}`,
                },
            ],
            thumbnail: `${bot_cdn_url}/spongebob-mocking.png`,
        }, message));
    },
});
