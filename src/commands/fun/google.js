'use strict';

//#region dependencies
const googleIt = require('google-it');

const { sendPotentiallyNotSafeForWorkDisclaimer } = require('../../libs/messages.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'GOOGLE',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Google Search',
    aliases: ['google'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;

        const potentially_nsfw_content_is_accepted = await sendPotentiallyNotSafeForWorkDisclaimer(message);
        if (!potentially_nsfw_content_is_accepted) return;

        const google_search_query = clean_command_args.join(' ').trim();
        const bot_message = await message.channel.send(new CustomRichEmbed({
            title: 'Searching Google For:',
            description: `${'```'}\n${google_search_query}\n${'```'}`,
        }, message));

        try {
            const google_search_results = await googleIt({
                'options': {
                    'no-display': true,
                },
                'query': google_search_query,
            });

            console.log({ google_search_results });

            if (google_search_results.length > 0) {
                bot_message.edit(new CustomRichEmbed({
                    title: 'Searched Google For:',
                    description: `${'```'}\n${google_search_query}\n${'```'}`,
                    fields: google_search_results.map(result => ({
                        name: `${result.title}`,
                        value: `<${result.link}>\n${result.snippet}`,
                    })),
                }, message));
            } else {
                bot_message.edit(new CustomRichEmbed({
                    color: 0xFF0000,
                    title: 'Something went wrong!',
                    description: [
                        'Google most likely changed their stuff, so now this stuff is broken.',
                        'Try asking the maintainer of [github:PatNeedham/google-it](https://github.com/PatNeedham/google-it) to fix the issue!',
                    ].join('\n'),
                }, message));
            }
        } catch (error) {
            console.trace(error);
        }
    },
});
