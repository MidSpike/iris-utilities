'use strict';

//#region local dependencies
const googleIt = require('google-it');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'GOOGLE',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Google Search',
    aliases: ['google'],
    async executor(Discord, client, message, opts = {}) {
        const { clean_command_args } = opts;
        if (!message.channel.nsfw) {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        title: 'This command requires an NSFW channel!',
                        description:
                            'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!',
                    },
                    message,
                ),
            );
            return;
        }
        const google_search_query = clean_command_args.join(' ').trim();
        const bot_message = await message.channel.send(
            new CustomRichEmbed(
                {
                    title: `Searching Google For:`,
                    description: `${'```'}\n${google_search_query}\n${'```'}`,
                },
                message,
            ),
        );
        try {
            const google_search_results = await googleIt({
                options: { 'no-display': true },
                query: google_search_query,
            });
            bot_message.edit(
                new CustomRichEmbed(
                    {
                        title: `Searched Google For:`,
                        description: `${'```'}\n${google_search_query}\n${'```'}`,
                        fields: google_search_results.map((result) => ({
                            name: `${result.title}`,
                            value: `<${result.link}>\n${result.snippet}`,
                        })),
                    },
                    message,
                ),
            );
        } catch (error) {
            console.trace(error);
        }
    },
});
