'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { sendOptionsMessage } = require('../../src/messages.js');

const bot_config = require(`../../config.json`);
//#endregion local dependencies

const bot_owner_discord_id = bot_config.owner_id;

module.exports = new DisBotCommand({
    name:'INVITE_DEVELOPER',
    category:`${DisBotCommander.categories.HIDDEN}`,
    description:'invites the developer to the server',
    aliases:['invite_developer'],
    async executor(Discord, client, message, opts={}) {
        const confirmEmbed = new CustomRichEmbed({
            title:`Are you sure you want to summon my developer to this server?`,
            description:`${'```'}fix\nWarning: Check with your server's staff to see if you are allowed to do this!\n${'```'}`
        }, message);
        sendOptionsMessage(message.channel.id, confirmEmbed, [{
            emoji_name:'white_check_mark',
            callback:async (options_message, collected_reaction, user) => {
                const guild_invite = await message.channel.createInvite({maxUses:1});
                const guild_invite_url = guild_invite.url;
                const guild_invite_channel = guild_invite.channel;
                const guild_invite_guild = guild_invite_channel.guild;
                if (guild_invite) {
                    const bot_owner = await client.users.fetch(bot_owner_discord_id);
                    const bot_owner_dms = await bot_owner.createDM();
                    bot_owner_dms.send(new CustomRichEmbed({
                        title:`You have been summoned by @${message.author.tag} (${message.author.id})`,
                        description:`[${guild_invite_guild?.name} > ${guild_invite_channel?.name}](${guild_invite_url})`
                    }));
                    options_message.edit(new CustomRichEmbed({
                        title:`My developer was invited to this server by @${message.author.tag}!`
                    }, message));
                } else {
                    options_message.edit(new CustomRichEmbed({
                        title:`Failed to Invite My Developer!`
                    }, message));
                }
            }
        }, {
            emoji_name:'x',
            callback:(rich_embed) => {
                rich_embed.edit(new CustomRichEmbed({title:'Canceled'}, message));
            }
        }], message.author.id);
    },
});
