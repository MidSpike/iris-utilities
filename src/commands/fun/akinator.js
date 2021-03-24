'use strict';

//#region dependencies
const Akinator_API = require('aki-api').Aki;

const { sendPotentiallyNotSafeForWorkDisclaimer } = require('../../libs/messages.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendOptionsMessage,
        removeAllReactionsFromMessage,
        removeUserReactionsFromMessage } = require('../../libs/messages.js');
const { findCustomEmoji,
        zero_to_nine_as_words,
        constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'AKINATOR',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'play a game of akinator directly from discord',
    aliases: ['akinator', 'aki'],
    async executor(Discord, client, message, opts={}) {
        const potentially_nsfw_content_is_accepted = await sendPotentiallyNotSafeForWorkDisclaimer(message);
        if (!potentially_nsfw_content_is_accepted) return;

        let bot_message;

        const akinator_api = new Akinator_API('en');
        await akinator_api.start();

        let question_num = 1;
        async function sendAkinatorQuestion() {
            const options_embed = new CustomRichEmbed({
                title: 'Akinator Time!',
                description: 'Choose an option to continue.',
                thumbnail: `${bot_cdn_url}/akinator_idle.png`,
                fields: [
                    {
                        name: `Question ${(await constructNumberUsingEmoji(question_num))}`,
                        value: `**${akinator_api.question}**`,
                    }, {
                        name: 'Answers',
                        value: `${(await Promise.all(
                            akinator_api.answers.map(async (value, index) => 
                                `${(await constructNumberUsingEmoji(index+1))} - ${value}`
                            )
                        )).join('\n')}`,
                    },
                ],
            }, message);

            const reactions = [
                {
                    emoji_name: 'bot_emoji_angle_left',
                    async callback(options_message, collected_reaction, user) {
                        removeUserReactionsFromMessage(options_message);
                        if (question_num > 1) {
                            await akinator_api.back();
                            question_num--;
                            sendAkinatorQuestion();
                        }
                    },
                },
                ...(await Promise.all(
                    akinator_api.answers.map(async (value, index) => ({
                        emoji_name: `${(await findCustomEmoji(`bot_emoji_${zero_to_nine_as_words[index+1]}`)).name}`,
                        async callback(options_message, collected_reaction, user) {
                            removeUserReactionsFromMessage(options_message);
    
                            question_num++;
    
                            await akinator_api.step(index);
    
                            const akinator_has_a_guess = akinator_api.progress >= 70 || akinator_api.currentStep >= 78;
                            if (akinator_has_a_guess) {
                                await akinator_api.win();
                                const akinator_guess = akinator_api.answers[0];
    
                                bot_message.edit(new CustomRichEmbed({
                                    title: 'Akinator Time!',
                                    description: [
                                        '**It is very clear to me now!**',
                                        'You are looking for this character:',
                                    ].join('\n'),
                                    thumbnail: `${bot_cdn_url}/akinator_idle.png`,
                                    fields: [
                                        {
                                            name: 'Character Name',
                                            value: `${akinator_guess.name}`,
                                        }, {
                                            name: 'Character Description',
                                            value: `${akinator_guess.description}`,
                                        }, {
                                            name: 'Questions Used',
                                            value: `${question_num}`,
                                        },
                                    ],
                                    image: `${akinator_guess.absolute_picture_path}`,
                                }, message));
    
                                removeAllReactionsFromMessage(bot_message);
                            } else {
                                /* Akinator needs the user to answer more questions! */
                                sendAkinatorQuestion();
                            }
                        },
                    }))
                )),
            ];

            if (bot_message) {
                await bot_message.edit(options_embed);
            } else {
                bot_message = await sendOptionsMessage(message.channel.id, options_embed, reactions, {
                    confirmation_user_id: message.author.id,
                });
            }
        }

        sendAkinatorQuestion();
    },
});
