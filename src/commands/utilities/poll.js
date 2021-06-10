'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { findCustomEmoji,
        constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'POLL',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 3,
    description: 'used for creating polls for people to vote on',
    aliases: ['poll'],
    cooldown: 5_000,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;

        const poll_args = message.content.replace(`${discord_command} `, '').split('\n');
        const poll_question = poll_args[0];
        const poll_choices = poll_args.slice(1);

        if (!poll_question || poll_choices.length === 0) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Whoops!',
                    description: [
                        'That\'s not how you do it!',
                        'I need a question and choices!',
                        '*Also notice how everything is on it\'s own line.*',
                    ].join('\n'),
                    fields: [
                        {
                            name: 'Example Poll',
                            value: `${'```'}\n${discord_command} Is this a cool feature?\nYes!\nNo!\n${'```'}`,
                        },
                    ],
                    footer: {
                        iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                        text: `${discord_command}`,
                    },
                }, message),
            });
            return;
        }

        if (poll_choices.length > 9) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Whoops!',
                    description: 'Due to the number machine being broken, only 9 answers are allowed for polls!',
                    footer: {
                        iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                        text: `${discord_command}`,
                    },
                }, message),
            });
            return;
        }

        const bot_message = await message.channel.send({
            embed: new CustomRichEmbed({
                title: 'Has created a poll!',
                thumbnail: `${bot_cdn_url}/Vote_2020-04-27_0.png`,
                fields: [
                    {
                        name: 'Poll Question',
                        value: `${poll_question}`,
                    }, {
                        name: 'Poll Choices',
                        value: (await Promise.all(
                            poll_choices.map(async (pc, i) => 
                                `${(await constructNumberUsingEmoji(i + 1))} — ${pc}`
                            )
                        )).join('\n\n'),
                    },
                ],
                footer: {
                    iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                    text: `${discord_command}`,
                },
            }, message),
        });

        for (let i = 0; i < poll_choices.length; i++) {
            const bot_emoji = await findCustomEmoji(`bot_emoji_${['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][i]}`);
            await bot_message.react(bot_emoji);
        }
    },
});
