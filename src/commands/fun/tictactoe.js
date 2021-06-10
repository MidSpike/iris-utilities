'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendOptionsMessage } = require('../../libs/messages.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

class TicTacToe {
    playerOneCharacter = '❌';
    playerTwoCharacter = '⭕';

    defaultGameValueCharacter = '⬛';

    gameValuesRowSize = 3;
    gameValues = new Array(this.gameValuesRowSize ** 2).fill(this.defaultGameValueCharacter);

    moveCount = 0;

    constructor() {}

    canMakeMove(locationIndex) {
        return this.gameValues[locationIndex - 1] === this.defaultGameValueCharacter;
    }

    makeMove(locationIndex) {
        if (!this.canMakeMove(locationIndex)) return false; // don't allow overriding

        const currentPlayerCharacter = this.moveCount % 2 === 0 ? this.playerOneCharacter : this.playerTwoCharacter;

        this.gameValues[locationIndex - 1] = currentPlayerCharacter;

        this.moveCount++;

        return true;
    }

    makeBoard() {
        let board = '';

        for (const gameValueIndex in this.gameValues) {
            const gameValue = this.gameValues[gameValueIndex];
            board = board + gameValue + ((parseInt(gameValueIndex) + 1) % this.gameValuesRowSize === 0 ? '\n' : '');
        }

        return board;
    }
}

module.exports = new DisBotCommand({
    name: 'TICTACTOE',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'play a game of TicTacToe',
    aliases: ['tictactoe', 'ttt'],
    async executor(Discord, client, message, opts = {}) {
        const { discord_command } = opts;

        const ticTacToe = new TicTacToe();

        async function makeEmbed() {
            let emoji_buttons_guide = '';

            for (const gameValueIndex in ticTacToe.gameValues) {
                const number_as_emoji = await constructNumberUsingEmoji(parseInt(gameValueIndex) + 1);
                emoji_buttons_guide = emoji_buttons_guide + number_as_emoji + ((parseInt(gameValueIndex) + 1) % ticTacToe.gameValuesRowSize === 0 ? '\n' : '');
            }

            return new CustomRichEmbed({
                title: `TicTacToe`,
                description: ticTacToe.makeBoard(),
                fields: [
                    {
                        name: 'Buttons',
                        value: emoji_buttons_guide,
                    },
                ],
                footer: {
                    iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                    text: `${discord_command}`,
                },
            });
        }

        const reactions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => ({
            emoji_name: `bot_emoji_${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][num]}`,
            async callback(options_message, collected_reaction, user) {
                // removeUserReactionsFromMessage(options_message);
                const move_was_successful = ticTacToe.makeMove(num);
                if (!move_was_successful) return;
                options_message.edit({
                    embed: await makeEmbed(),
                });
            }
        }));

        sendOptionsMessage(message.channel.id, {
            embed: await makeEmbed(),
        }, reactions);
    },
});
