'use strict';

const moment = require('moment-timezone');

const bot_config = require('../../config.js');

const { pseudoUniqueId } = require('../utilities.js');

const { client } = require('./discord_client.js');
const { CustomRichEmbed } = require('./CustomRichEmbed.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_common_name = bot_config.COMMON_NAME;
const bot_central_errors_channel_id = process.env.BOT_LOGGING_CHANNEL_ERRORS_ID;
const bot_support_guild_invite_url = `https://discord.gg/${process.env.BOT_SUPPORT_GUILD_INVITE_CODE}`;

//---------------------------------------------------------------------------------------------------------------//

const fallback_user_error = new Error('Something went very wrong! There is no error information!');
async function logUserError(message, error=fallback_user_error) {
    const error_id = pseudoUniqueId();
    const error_timestamp = moment();
    const error_embed = new CustomRichEmbed({
        color: 0xFF0000,
        author: {
            iconURL: message.author.displayAvatarURL({dynamic: true}),
            name: `@${message.author.tag} (${message.author.id})`,
        },
        title: `An error has occurred with ${bot_common_name}!`,
        description: `If you need assistance, please join the [${bot_common_name} Support Server](${bot_support_guild_invite_url})!`,
        fields: [
            {
                name: 'Guild:',
                value: `${message.guild.name} (${message.guild.id})`,
            }, {
                name: 'Channel:',
                value: `#${message.channel.name} (${message.channel.id})`,
            }, {
                name: 'User:',
                value: `@${message.author.tag} (${message.author.id})`,
            }, {
                name: 'Error Id:',
                value:`${error_id}`,
            }, {
                name: 'Timestamp:',
                value: `${error_timestamp}`,
            }, {
                name: 'Information:',
                value: `${'```'}\n${error}\n${'```'}`,
            },
        ],
    });

    /* output to message.channel */
    message.channel.send({
        embed: error_embed,
    }).catch(console.warn);

    /* output to central error logging channel */
    const central_errors_channel = client.$.bot_guilds.logging.channels.resolve(bot_central_errors_channel_id);
    await central_errors_channel.send({
        embed: error_embed,
    }).catch(console.trace);

    /* output to the console */
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`Error In Guild: ${message.guild.name}`);
    console.error(`Caused by: @${message.author.tag} (${message.author.id})`);
    console.error(`Command Used: ${message.cleanContent}`);
    console.trace(error);
    console.error('----------------------------------------------------------------------------------------------------------------');
}

module.exports = {
    logUserError,
};
