'use strict';

//#region local dependencies
const { math_clamp } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { removeUserReactionsFromMessage, sendOptionsMessage } = require('../../src/messages.js');
const { constructNumberUsingEmoji } = require('../../src/emoji.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'HELP',
    category:`${DisBotCommander.categories.HELP}`,
    description:'Displays a list of commands page by page',
    aliases:['help'],
    access_level:DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        const command_categories = [
            DisBotCommander.categories.HELP,
            DisBotCommander.categories.INFO,
            DisBotCommander.categories.MUSIC_PLAYBACK,
            DisBotCommander.categories.MUSIC_CONTROLS,
            // DisBotCommander.categories.MUSIC_LEAVE,
            DisBotCommander.categories.FUN,
            DisBotCommander.categories.UTILITIES,
            DisBotCommander.categories.ADMINISTRATOR,
            DisBotCommander.categories.GUILD_SETTINGS
        ];

        const formated_command_categories = command_categories.map(category_name => {
            const commands_in_category = DisBotCommander.commands.filter(command => command.category === category_name);

            /**
             * Example Output: [`% | %play | %p | %playnext | %pn`, `%search`]
             */
            const formatted_commands = commands_in_category.map(command => 
                command.aliases.map(command_alias => 
                    `${command_prefix}${command_alias.replace('#{cp}', `${command_prefix}`)}`
                ).join(' | ')
            );

            return {
                category_name:`${category_name}`,
                formatted_commands:formatted_commands
            };
        });

        const all_commands_fields = formated_command_categories.map((formated_command_category, index) => ({
            name:`${constructNumberUsingEmoji(index+1)} — ${formated_command_category.category_name}`,
            value:`${'```'}\n${formated_command_category.formatted_commands.join('\n')}\n${'```'}`
        }));

        let current_page_number = 1;
        function makeHelpEmbed(page_number) {
            current_page_number = page_number;
            const help_page_commands_field = all_commands_fields[page_number-1];
            return new CustomRichEmbed({
                title:`I'm here to help! Let's start by navigating the help menu's pages!`,
                fields:[
                    {name:`Help Pages`, value:`${'```'}\n${command_categories.map((command_category, index) => `${index+1} — ${command_category}`).join('\n')}\n${'```'}`},
                    {name:'\u200b', value:'\u200b'},
                    help_page_commands_field,
                    ...(!message.guild.me.hasPermission('MANAGE_MESSAGES') ? [
                        {name:'\u200b', value:'\u200b'},
                        {name:`Help Menu Navigation`, value:`Use the following to navigate the help menu!${'```'}\n${discord_command} PAGE_NUMBER_HERE\n${'```'}`}
                    ] : [])
                ]
            }, message);
        }

        const page_number_input = parseInt(command_args[0]) || 1; // Do not use ??
        const proccessed_number_input = math_clamp(page_number_input, 1, command_categories.length)

        if (!message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            message.channel.send(makeHelpEmbed(proccessed_number_input));
        } else {
            function navigate_page(options_message, page_number=1) {
                options_message.edit(makeHelpEmbed(page_number));
                removeUserReactionsFromMessage(options_message);
            }
            sendOptionsMessage(message.channel.id, makeHelpEmbed(proccessed_number_input), [
                {emoji_name:'bot_emoji_angle_left', callback:(options_message) => navigate_page(options_message, current_page_number > 1 ? current_page_number-1 : command_categories.length)},
                {emoji_name:'bot_emoji_one', callback:(options_message) => navigate_page(options_message, 1)},
                {emoji_name:'bot_emoji_two', callback:(options_message) => navigate_page(options_message, 2)},
                {emoji_name:'bot_emoji_three', callback:(options_message) => navigate_page(options_message, 3)},
                {emoji_name:'bot_emoji_four', callback:(options_message) => navigate_page(options_message, 4)},
                {emoji_name:'bot_emoji_five', callback:(options_message) => navigate_page(options_message, 5)},
                {emoji_name:'bot_emoji_six', callback:(options_message) => navigate_page(options_message, 6)},
                {emoji_name:'bot_emoji_seven', callback:(options_message) => navigate_page(options_message, 7)},
                {emoji_name:'bot_emoji_eight', callback:(options_message) => navigate_page(options_message, 8)},
                // {emoji_name:'bot_emoji_nine', callback:(options_message) => navigate_page(options_message, 9)},
                {emoji_name:'bot_emoji_angle_right', callback:(options_message) => navigate_page(options_message, current_page_number < command_categories.length ? current_page_number+1 : 1)}
            ]);
        }
    },
});
