'use strict';

//#region local dependencies
const axios = require('axios');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendConfirmationEmbed } = require('../../libs/messages.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'MEMBERLIST',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'allows you to download a member list for the server',
    aliases: ['memberlist'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const members = await message.guild.members.fetch();
        const mapped_members = members.map(member => ({
            id: member.user.id,
            tag: member.user.tag,
            display_name: member.displayName,
            roles: member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
            })),
        }));

        console.log(mapped_members);

        // sendConfirmationEmbed(message.author.id, message.channel.id, false, embed, showResults, showResults);
    },
});
