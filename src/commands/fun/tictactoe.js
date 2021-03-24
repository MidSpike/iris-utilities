'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendOptionsMessage } = require('../../libs/messages.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TICTACTOE',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'play tictactoe lol',
    aliases: ['tictactoe'],
    async executor(Discord, client, message, opts = {}) {
        const { discord_command } = opts;
        const default_game_board = [
            `123`,
            `456`,
            `789`,
        ];
        const game_values = ['⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛', '⬛'];
        function constructGameBoard(game_values) {
            let new_game_board = `${default_game_board.join('\n')}`;
            for (let index = 0; index < game_values.length; index++) {
                new_game_board = new_game_board.replace(`${index + 1}`, `${game_values[index]}`);
            }
            return new_game_board;
        }
        function makeMove(location = 1, mark = '❌') {
            if (game_values[location - 1] !== '⬛') {
                return false; // unable to make move
            } else {
                game_values[location - 1] = `${mark}`;
                return true; // able to make move
            }
        }
        async function makePlayerTurnEmbed(current_player) {
            return new CustomRichEmbed({
                title: `${current_player === 'PLAYER_A' ? 'Make a move Player A!' : `It's your turn Player B!`}`,
                description: `${current_player === 'PLAYER_A' ? 'Player A' : 'Player B'} is the letter \`${current_player === 'PLAYER_A' ? '❌' : '⭕'}\``,
                fields: [
                    {
                        name: 'Game',
                        value: `${constructGameBoard(game_values)}`,
                    }, {
                        name: 'Buttons',
                        value: `${(await Promise.all(
                            default_game_board.map(async (x) => 
                                await constructNumberUsingEmoji(x)
                            )
                        )).join('\n')}`,
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
            callback(options_message, collected_reaction, user) {
                // removeUserReactionsFromMessage(options_message);
                if (!makeMove(num, current_player === 'PLAYER_A' ? '❌' : '⭕')) return;
                current_player = current_player === 'PLAYER_A' ? 'PLAYER_B' : 'PLAYER_A';
                options_message.edit(makePlayerTurnEmbed(current_player));
            }
        }));
        let current_player = 'PLAYER_A';
        sendOptionsMessage(message.channel.id, makePlayerTurnEmbed(current_player), reactions);
    },
});
