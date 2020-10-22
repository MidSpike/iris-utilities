'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_support_guild_id = process.env.BOT_SUPPORT_GUILD_ID;

module.exports = new DisBotCommand({
    name:'SUPPORT_DISCORD',
    category:`${DisBotCommander.categories.HELP_INFO}`,
    weight:16,
    description:'Generates an invite to the support server',
    aliases:['support_discord'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;
        const support_guild = client.guilds.cache.get(bot_support_guild_id);
        const support_guild_invite = await support_guild.channels.cache.filter(c => c.type === 'text').first().createInvite({
            unique: true,
            maxAge: 60 * 60 * 24, // 24 hours in seconds
            reason: `@${message.author.tag} (${message.author.id}) used ${discord_command} in ${message.guild.name} ${message.guild.id}`,
        });
        message.channel.send(new CustomRichEmbed({
            title: `Hey ${message.author.username}, you can speak with my support staff here!`,
            description: `Click to join the [${support_guild.name} Discord](${support_guild_invite.url})!`,
        }, message)).catch(console.warn);
    },
});
