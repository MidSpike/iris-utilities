'use strict';

//#region dependencies
const { COMMON_NAME: bot_common_name } = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

const bot_central_feedback_channel_id = process.env.BOT_LOGGING_CHANNEL_COMMUNITY_FEEDBACK_ID;
const bot_support_guild_invite_url = `https://discord.gg/${process.env.BOT_SUPPORT_GUILD_INVITE_CODE}`;

module.exports = new DisBotCommand({
    name: 'FEEDBACK',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 14,
    description: 'allows you to send feedback to the developers',
    aliases: ['feedback'],
    cooldown: 15_000,
    async executor(Discord, client, message, opts={}) {
        const { command_args, discord_command } = opts;

        if (command_args.join('').trim().length > 0) { // see if they left feedback
            const central_feedback_channel = client.$.bot_guilds.logging.channels.resolve(bot_central_feedback_channel_id);

            await central_feedback_channel.send(new CustomRichEmbed({
                author: {
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    name: `@${message.author.tag} (${message.author.id})`,
                },
                description: `${'```'}\n${command_args.join(' ')}\n${'```'}`,
            })).catch(console.warn);

            message.channel.send(new CustomRichEmbed({
                title: 'Thanks for the feedback!',
                description: `Your message was sent to the [${bot_common_name} Support Discord](${bot_support_guild_invite_url})!`,
            }, message)).catch(console.warn);
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'This is a feedback command!',
                description: `Please leave a message with some feedback after \`${discord_command}\`. Example: ${'```'}\n${discord_command} wow this is a cool bot!\n${'```'}`,
            }, message)).catch(console.warn);
        }
    },
});
