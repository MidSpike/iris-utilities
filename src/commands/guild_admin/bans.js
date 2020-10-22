'use strict';

//#region local dependencies
const { array_chunks } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
const { sendOptionsMessage, removeUserReactionsFromMessage } = require('../../libs/messages.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'BANS',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'displays all of the banned members in this guild',
    aliases: ['bans'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        if (!botHasPermissionsInGuild(message, ['VIEW_AUDIT_LOG'])) return;

        const guild_bans = await message.guild.fetchBans();

        const page_fields = guild_bans.map(guild_ban => ({
            name: `Ban Record`,
            value: [
                `${'```'}\n`,
                `User: ${guild_ban.user.tag} (${guild_ban.user.id})`,
                `Reason: ${guild_ban.reason ?? 'N/A'}`,
                `\n${'```'}`,
            ].join('\n'),
        }));

        const pages = array_chunks(page_fields, 10);

        let page_index = 0;
        function makeEmbed() {
            const bans_page = pages[page_index];
            return new CustomRichEmbed({
                title: `Here are the bans in this guild, 10 at a time!`,
                description: [
                    `Displaying ${constructNumberUsingEmoji(bans_page.length)} / ${constructNumberUsingEmoji(`${page_fields.length}`)} bans!`,
                    `Page — ${constructNumberUsingEmoji(page_index + 1)} / ${constructNumberUsingEmoji(pages.length)}`,
                ].join('\n'),
                fields: bans_page,
            }, message);
        }

        sendOptionsMessage(message.channel.id, makeEmbed(), [
            {
                emoji_name: 'bot_emoji_angle_left',
                callback(options_message, collected_reaction, user) {
                    removeUserReactionsFromMessage(options_message);
                    page_index--;
                    if (page_index < 0) {
                        page_index = pages.length-1;
                    }
                    options_message.edit(makeEmbed());
                },
            }, {
                emoji_name: 'bot_emoji_angle_right',
                callback(options_message, collected_reaction, user) {
                    removeUserReactionsFromMessage(options_message);
                    page_index++;
                    if (page_index > pages.length-1) {
                        page_index = 0;
                    }
                    options_message.edit(makeEmbed());
                },
            },
        ]);
    },
});
