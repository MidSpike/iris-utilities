'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_central_feedback_channel_id = process.env.BOT_LOGGING_CHANNEL_COMMUNITY_FEEDBACK_ID;
const bot_support_guild_id = process.env.BOT_SUPPORT_GUILD_ID;

module.exports = new DisBotCommand({
    name:'FEEDBACK',
    category:`${DisBotCommander.categories.INFO}`,
    weight:4,
    description:'Allows users to send feedback about the bot to the developers',
    aliases:['feedback'],
    async executor(Discord, client, message, opts={}) {
        const { command_args, discord_command } = opts;
        if (command_args.join('').length > 1) {// See if they left some feedback
            client.channels.cache.get(bot_central_feedback_channel_id).send(new CustomRichEmbed({
                author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                description:`${'```'}\n${command_args.join(' ')}${'```'}`
            })).then(async () => {
                const support_guild = client.guilds.cache.get(bot_support_guild_id);
                const support_guild_invite = await support_guild.channels.cache.filter(c => c.type === 'text').first().createInvite({
                    unique:true,
                    maxAge:60 * 60 * 24, // 24 hours
                    reason:`@${message.author.tag} (${message.author.id}) used ${discord_command} in ${message.guild.name} ${message.guild.id}`
                });
                message.channel.send(new CustomRichEmbed({
                    title:`Thanks for the feedback!`,
                    description:`Your message was sent to the [${support_guild.name} Discord](${support_guild_invite.url})!`
                }, message));
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`This is a feedback command!`,
                description:`Please leave a message with some feedback after \`${discord_command}\`. Exanple: ${'```'}\n${discord_command} wow this is a cool bot!\n${'```'}`
            }, message));
        }
    },
});
