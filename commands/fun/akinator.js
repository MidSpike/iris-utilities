'use strict';

//#region local dependencies
const Akinator_API = require('aki-api').Aki;

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { removeUserReactionsFromMessage, removeAllReactionsFromMessage, sendOptionsMessage } = require('../../src/messages.js');
const { zero_to_nine_as_words, findCustomEmoji, constructNumberUsingEmoji } = require('../../src/emoji.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'AKINATOR',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Play a game of akinator in the bot',
    aliases:['akinator'],
    async executor(Discord, client, message, opts={}) {
        let aki_message;
        const akinator_api = new Akinator_API('en');
        await akinator_api.start();
        let question_num = 1;
        async function _send_questions() {
            async function _proceed_with_game(rich_embed, step_num) {
                question_num++;
                await akinator_api.step(step_num);
                if (akinator_api.progress >= 70 || akinator_api.currentStep >= 78) { // Akinator has a guess for us!
                    await akinator_api.win();
                    const akinator_guess = akinator_api.answers[0];
                    aki_message.edit(new CustomRichEmbed({
                        title:'Akinator Time!',
                        description:`**It is very clear to me now!**\nYou are looking for this character:`,
                        thumbnail:`${bot_cdn_url}/akinator_idle.png`,
                        fields:[
                            {name:'Character Name', value:`${akinator_guess.name}`},
                            {name:'Character Description', value:`${akinator_guess.description}`},
                            {name:'Character Picture', value:`[Link](${akinator_guess.absolute_picture_path})`},
                            {name:'Questions Needed', value:`${question_num}`}
                        ],
                        image:`${akinator_guess.absolute_picture_path}`
                    }, message));
                    removeAllReactionsFromMessage(aki_message);
                } else { // Akinator needs more!
                    _send_questions();
                }
            }
            // let question_active = true;
            const options_embed = new CustomRichEmbed({
                title:'Akinator Time!',
                description:'Choose an option to continue.',
                thumbnail:`${bot_cdn_url}/akinator_idle.png`,
                fields:[
                    {name:`Question ${constructNumberUsingEmoji(question_num)}`, value:`**${akinator_api.question}**`},
                    {name:'Answers', value:`${akinator_api.answers.map((value, index) => `${constructNumberUsingEmoji(index+1)} - ${value}`).join('\n')}`}
                ]
            }, message);
            const reactions = [
                {
                    emoji_name:'bot_emoji_angle_left',
                    callback:async (options_message, collected_reaction, user) => {
                        removeUserReactionsFromMessage(options_message);
                        if (question_num > 1) {
                            await akinator_api.back();
                            question_num--;
                            _send_questions();
                        }
                    }
                }, ...akinator_api.answers.map((value, index) => ({
                    emoji_name:`${findCustomEmoji(`bot_emoji_${zero_to_nine_as_words[index+1]}`).name}`,
                    callback:async (options_message, collected_reaction, user) => {
                        removeUserReactionsFromMessage(options_message);
                        _proceed_with_game(options_message, index);
                    }
                }))
            ];
            if (aki_message) {
                await aki_message.edit(options_embed);
            } else {
                aki_message = await sendOptionsMessage(message.channel.id, options_embed, reactions, message.author.id);
            }
        } _send_questions();
    },
});
