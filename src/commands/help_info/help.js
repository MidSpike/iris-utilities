'use strict';

//#region dependencies
const { math_clamp } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { removeUserReactionsFromMessage,
        sendOptionsMessage } = require('../../libs/messages.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'HELP',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 1,
    description: 'displays a list of paginated commands',
    aliases: ['help'],
    access_level: DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        const command_categories = [
            DisBotCommander.categories.HELP_INFO,
            DisBotCommander.categories.MUSIC,
            DisBotCommander.categories.FUN,
            DisBotCommander.categories.UTILITIES,
            DisBotCommander.categories.GUILD_ADMIN,
            DisBotCommander.categories.GUILD_SETTINGS,
            DisBotCommander.categories.GUILD_OWNER,
        ];

        const formatted_command_categories = command_categories.map(category_name => {
            const commands_in_category = DisBotCommander.commands.filter(command => command.category === category_name);

            const sorted_commands_in_category = commands_in_category.sort((a, b) => a.weight - b.weight);

            /* Example Output: [`% | %play | %p | %playnext | %pn`, `%search`] */
            const formatted_commands = sorted_commands_in_category.map(command => 
                command.aliases.map(command_alias => 
                    `${command_prefix}${command_alias.replace('#{cp}', `${command_prefix}`)}`
                ).join(' | ')
            );

            return {
                category_name: `${category_name}`,
                formatted_commands: formatted_commands,
            };
        });

        const all_commands_fields = formatted_command_categories.map((formatted_command_category, index) => ({
            name: `${constructNumberUsingEmoji(index+1)} — ${formatted_command_category.category_name}`,
            value: `${'```'}\n${formatted_command_category.formatted_commands.join('\n')}\n${'```'}`,
        }));

        let current_page_number = 1;
        function makeHelpEmbed(page_number) {
            current_page_number = page_number;
            const help_page_commands_field = all_commands_fields[page_number-1];
            return new CustomRichEmbed({
                title: `I\'m here and ready to help! Navigate this menu for more!`,
                fields: [
                    {
                        name: `Help Pages`,
                        value: `${'```'}\n${command_categories.map((command_category, index) => `${index+1} — ${command_category}`).join('\n')}\n${'```'}`,
                    }, {
                        name: '\u200b',
                        value: '\u200b',
                    },
                    help_page_commands_field,
                    ...(!message.guild.me.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES) ? [
                        {
                            name: '\u200b',
                            value:'\u200b',
                        }, {
                            name: `Help Menu Navigation`,
                            value: `Use the following to navigate the help menu!${'```'}\n${discord_command} PAGE_NUMBER_HERE\n${'```'}`,
                        },
                    ] : []),
                ],
            }, message);
        }

        const specified_command_input = `${command_args[0] ?? ''}`.trim().toLowerCase();

        if (specified_command_input.length === 0 || !isNaN(parseInt(specified_command_input))) {
            /* the user specified a page number or is lacking input after the command */
            const page_number_input = parseInt(specified_command_input) || 1;
            const processed_number_input = math_clamp(page_number_input, 1, command_categories.length)
            if (!message.guild.me.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
                message.channel.send(makeHelpEmbed(processed_number_input));
            } else {
                function navigate_page(options_message, page_number=1) {
                    options_message.edit(makeHelpEmbed(page_number));
                    removeUserReactionsFromMessage(options_message);
                }
                sendOptionsMessage(message.channel.id, makeHelpEmbed(processed_number_input), [
                    {
                        emoji_name: 'bot_emoji_angle_left',
                        callback(options_message) {
                            navigate_page(options_message, current_page_number > 1 ? current_page_number-1 : command_categories.length);
                        },
                    }, {
                        emoji_name: 'bot_emoji_one',
                        callback(options_message) {
                            navigate_page(options_message, 1);
                        },
                    }, {
                        emoji_name: 'bot_emoji_two',
                        callback(options_message) {
                            navigate_page(options_message, 2);
                        },
                    }, {
                        emoji_name: 'bot_emoji_three',
                        callback(options_message) {
                            navigate_page(options_message, 3);
                        },
                    }, {
                        emoji_name: 'bot_emoji_four',
                        callback(options_message) {
                            navigate_page(options_message, 4);
                        },
                    }, {
                        emoji_name: 'bot_emoji_five',
                        callback(options_message) {
                            navigate_page(options_message, 5);
                        },
                    }, {
                        emoji_name: 'bot_emoji_six',
                        callback(options_message) {
                            navigate_page(options_message, 6);
                        },
                    }, {
                        emoji_name: 'bot_emoji_seven',
                        callback(options_message) {
                            navigate_page(options_message, 7);
                        },
                    },
                    // {
                    //     emoji_name:'bot_emoji_eight',
                    //     callback(options_message) {
                    //         navigate_page(options_message, 8);
                    //     },
                    // }, {
                    //     emoji_name:'bot_emoji_nine',
                    //     callback(options_message) {
                    //         navigate_page(options_message, 9);
                    //     },
                    // },
                    {
                        emoji_name: 'bot_emoji_angle_right',
                        callback(options_message) {
                            navigate_page(options_message, current_page_number < command_categories.length ? current_page_number+1 : 1);
                        },
                    }
                ]);
            }
        } else {
            /* the user specified a potential command name, not a page number */
            const specified_command_input_with_prefix = specified_command_input.startsWith(command_prefix) ? specified_command_input : `${command_prefix}${specified_command_input}`;
            const specified_command = DisBotCommander.commands.find(cmd => 
                cmd.aliases.map(cmd => 
                    `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`
                ).includes(specified_command_input_with_prefix)
            );
            if (specified_command) {
                const specified_command_aliases = specified_command.aliases.map(cmd => `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`);
                message.channel.send(new CustomRichEmbed({
                    title: `About Command — ${specified_command_input}`,
                    description: [
                        `**Formal Name:** ${specified_command.name}`,
                        `**Category:** ${specified_command.category}`,
                        `**Description:** ${specified_command.description}`,
                        `**Aliases:** \`${specified_command_aliases.join(', ')}\``,
                        `**Cooldown:** ${specified_command.cooldown} milliseconds`,
                        `**Access Level:** ${specified_command.access_level}`,
                    ].join('\n'),
                }, message));
            } else {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: `About Command — ${specified_command_input}`,
                    description: `I couldn\'t find that command!`,
                }, message));
            }
        }
    },
});
