'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'ALL_COMMANDS',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 2,
    description: 'displays all of the commands at once',
    aliases: ['all_commands'],
    access_level: DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix } = opts;

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

        const all_commands_fields = await Promise.all(
            formatted_command_categories.map(async (formatted_command_category, index) => ({
                name: `${(await constructNumberUsingEmoji(index+1))} — ${formatted_command_category.category_name}`,
                value: `${'```'}\n${formatted_command_category.formatted_commands.join('\n')}\n${'```'}`,
            }))
        );

        message.channel.send({
            embeds: [
                new CustomRichEmbed({
                    title: `Here are all of the commands, all at once!`,
                    fields: all_commands_fields,
                }, message),
            ],
        });
    },
});
