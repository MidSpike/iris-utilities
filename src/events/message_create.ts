//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, DiscordClientWithSharding } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import urlBlockingHandler from '@root/handlers/url_blocking_handler';

import chatArtificialIntelligenceHandler from '@root/handlers/chat_ai_handler';

//------------------------------------------------------------//

const event_name = Discord.Events.MessageCreate;
export default {
    name: event_name,
    async handler(
        discord_client: DiscordClientWithSharding,
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
                            'You might have noticed that I have undergone a lot of changes suddenly.',
                            'Over the past few months my developer has completely rewritten my codebase.',
                            '',
                            'These changes come with massive improvements:',
                            '- Massive performance improvements',
                            '- Support for threads and stages',
                            '- Slash commands',
                            '- Content-menu commands',
                            '- Message components',
                            '- New commands',
                            '- Voice commands (coming soon for donators)',
                            '- Donator commands (coming soon)',
                            '- and so much more',
                            '',
                            'Unfortunately these changes also come with some downgrades:',
                            '- Removal of guild command prefixes (e.g. `%`)',
                            '- Removal of command aliases (e.g. `%p` is now `/play`)',
                            '- Removal of infrequently used commands',
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
            chatArtificialIntelligenceHandler(discord_client, message);
        }
    },
} as ClientEventExport<typeof event_name>;
