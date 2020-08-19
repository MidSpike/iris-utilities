'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');

const bot_config = require(`../../config.json`);
//#endregion local dependencies

const bot_support_guild_info_channel_id = bot_config.support_guild_info_channel_id;
const bot_support_guild_id = process.env.BOT_SUPPORT_GUILD_ID;

module.exports = new DisBotCommand({
    name:'SUPPORT_DISCORD',
    category:`${DisBotCommander.categories.INFO}`,
    weight:6,
    description:'Generates an invite to the support server',
    aliases:['support_discord'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;
        const support_guild = client.guilds.cache.get(bot_support_guild_id);
        const support_guild_invite = await support_guild.channels.cache.get(bot_support_guild_info_channel_id).createInvite({
            unique:true,
            maxAge:60 * 60 * 24, // 24 hours in seconds
            reason:`@${message.author.tag} (${message.author.id}) used ${discord_command} in ${message.guild.name} ${message.guild.id}`
        });
        message.channel.send(new CustomRichEmbed({
            title:`Hey ${message.author.username}, You can speak with some people involved with the bot here!`,
            description:`Click to join the [${support_guild.name} Discord](${support_guild_invite.url})!`
        }, message));
    },
});
