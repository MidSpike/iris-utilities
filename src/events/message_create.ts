//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from 'typings';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import urlBlockingHandler from '@root/handlers/url_blocking_handler';

//------------------------------------------------------------//

const event_name = Discord.Events.MessageCreate;
export default {
    name: event_name,
    async handler(
        discord_client,
        message,
    ) {
        if (!discord_client.isReady()) return;

        if (message.author.bot) return; // don't respond to bots
        if (message.author.system) return; // don't respond to system messages

        /* check if the bot was pinged (but not replied to) */
        if (
            !message.reference &&
            message.mentions.users.has(discord_client.user.id)
        ) {
            await message.reply({
                embeds: [
                    CustomEmbed.from({
                        title: `Hello there, I\'m ${discord_client.user.username}!`,
                        description: [
                            'You might have noticed that this guild\'s command prefix no longer works.',
                            'Over the past few months my developer has completely rewritten my codebase.',
                            '',
                            'These changes come with massive improvements:',
                            '- Massive Performance Improvements',
                            '- Support for threads and stages',
                            '- Slash Commands',
                            '- Content-Menu Commands',
                            '- Message Components',
                            '- and so much more',
                            '',
                            'Unfortunately these changes also come with some downgrades:',
                            '- Removed guild command prefixes',
                            '- Removed command aliases',
                            '- Removed a few unused features',
                            '',
                            'Thank you for choosing to use me!',
                        ].join('\n'),
                    }),
                ],
            }).catch(console.warn);
        }

        /* run guild message handlers */
        if (message.inGuild()) {
            urlBlockingHandler(discord_client, message);
        }
    },
} as ClientEventExport<typeof event_name>;
