'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');

const { findCustomEmoji, constructNumberUsingEmoji } = require('../../src/emoji.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'POLL',
    category:`${DisBotCommander.categories.FUN}`,
    description:'used for creating polls to vote on',
    aliases:['poll'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (command_args.join('').length > 0) {
            const poll_args = message.content.replace(`${discord_command} `, '').split('\n');
            const poll_question = poll_args[0];
            const poll_choices = poll_args.slice(1);
            if (poll_question && poll_choices.length > 0) {
                if (poll_choices.length < 10) {
                    const bot_message = await message.channel.send(new CustomRichEmbed({
                        title:`Has created a poll!`,
                        thumbnail:`${bot_cdn_url}/Vote_2020-04-27_0.png`,
                        fields:[
                            {name:`Poll Question`, value:`${poll_question}`},
                            {name:`Poll Choices`, value:`${poll_choices.map((pc, i) => `${constructNumberUsingEmoji(i+1)} — ${pc}`).join('\n\n')}`}
                        ],
                        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                    }, message));
                    for (let i = 0; i < poll_choices.length; i++) {
                        const bot_emoji = findCustomEmoji(`bot_emoji_${['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][i]}`);
                        await bot_message.react(bot_emoji);
                    }
                } else {
                    message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`Whoops!`,
                        description:`Due to the number machine being broken, only 9 answers for a poll are allowed!`,
                        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                    }, message));
                }
            } else {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`Whoops!`,
                    description:`That's not how you do it!\nI need a question and choices!`,
                    fields:[
                        {name:'Example Poll', value:`${'```'}\n${discord_command} Is this a cool feature?\nYes!\nNo!${'```'}`}
                    ],
                    footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                }, message));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Time to get some results!`,
                description:`You can create a poll by doing the following!`,
                fields:[
                    {name:'Example Poll', value:`${'```'}\n${discord_command} Is this a cool feature?\nYes!\nNo!${'```'}`}
                ]
            }, message));
        }
    },
});
