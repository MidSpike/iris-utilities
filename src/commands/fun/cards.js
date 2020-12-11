'use strict';

//#region dependencies
const { Timer,
        array_make,
        array_random } = require('../../utilities.js');

const { sendPotentiallyNotSafeForWorkDisclaimer } = require('../../libs/messages.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');

const cards_against_humanity_json = require('../../../files/cards_against_humanity.json');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'CARDS',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'Cards Against Humanity',
    aliases: ['cards'],
    async executor(Discord, client, message, opts={}) {
        const potentially_nsfw_content_is_accepted = await sendPotentiallyNotSafeForWorkDisclaimer(message);
        if (!potentially_nsfw_content_is_accepted) return;

        const bot_message = await message.channel.send(new CustomRichEmbed({
            title: `Cards Against Humanity`,
            description: 'Fetching random card set!\nPlease wait...',
        })).catch(console.warn);

        await Timer(1500);

        const black_cards = cards_against_humanity_json.filter(card => card.cardType === 'Q');
        const white_cards = cards_against_humanity_json.filter(card => card.cardType === 'A');


        const selected_black_card = array_random(black_cards.filter(card => card.numAnswers === 2));
        const selected_white_cards = array_make(selected_black_card.numAnswers).map(() => array_random(white_cards));

        bot_message.edit(new CustomRichEmbed({
            title: `Cards Against Humanity`,
            fields: [
                {
                    name: 'Black Card',
                    value: `${'```'}\n${selected_black_card.text.replace(/([_]+)/gi, '_____')}\n${'```'}`,
                },
                ...selected_white_cards.map(white_card => ({
                    name: 'White Card',
                    value: `${'```'}\n${white_card.text}\n${'```'}`,
                    inline: true,
                })),
            ],
        }, message));
    },
});
