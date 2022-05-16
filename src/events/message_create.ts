'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { CustomEmbed } from '../common/app/message';

//------------------------------------------------------------//

export default {
    name: 'messageCreate',
    async handler(discord_client: Discord.Client<true>, message: Discord.Message) {
        if (message.author.bot) return; // don't respond to bots
        if (message.author.system) return; // don't respond to system messages

        /* check if the bot was pinged in a guild */
        if (message.guild && !message.reference && message.mentions.users.has(discord_client.user.id)) {
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

            return;
        }
    },
};
