'use strict';

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const bot_config = require('../config.json');

const { pseudoUniqueId } = require('../utilities.js');

const { CustomRichEmbed } = require('./CustomRichEmbed.js');

const { client } = require('./bot.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_common_name = bot_config.common_name;
const bot_support_guild_invite_url = bot_config.support_guild_invite_url;
const bot_error_log_file = path.join(process.cwd(), process.env.BOT_ERROR_LOG_FILE);
const bot_central_errors_channel_id = process.env.BOT_LOGGING_CHANNEL_ERRORS_ID;

//---------------------------------------------------------------------------------------------------------------//

const fallback_user_error = new Error('Something went horribly wrong! There is no error information!');
function logUserError(message, error=fallback_user_error) {
    const error_id = pseudoUniqueId();
    const error_timestamp = moment();
    const error_embed = new CustomRichEmbed({
        color:0xFF0000,
        author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
        title:`An Error Has Occurred With ${bot_common_name}!`,
        description:`If you need assistance, please join the [${bot_common_name} Support Server](${bot_support_guild_invite_url})!`,
        fields:[
            {name:'Guild:', value:`${message.guild.name} (${message.guild.id})`},
            {name:'Channel:', value:`#${message.channel.name} (${message.channel.id})`},
            {name:'User:', value:`@${message.author.tag} (${message.author.id})`},
            {name:'Error Id:', value:`${error_id}`},
            {name:'Timestamp:', value:`${error_timestamp}`},
            {name:'Information:', value:`${'```'}\n${error}${'```'}`}
        ]
    });
    message.channel.send(error_embed).catch(console.warn); // Send error to the guild
    client.channels.cache.get(bot_central_errors_channel_id).send(error_embed).catch(console.trace);  // Send error to central discord log
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`Error In Server ${message.guild.name}`);
    console.error(`Caused by @${message.author.tag} (${message.author.id})`);
    console.error(`Command Used: ${message.cleanContent}`);
    console.trace(error);
    console.error('----------------------------------------------------------------------------------------------------------------');
    fs.appendFile(bot_error_log_file, [
        `Id: ${error_id}`,
        `Timestamp: ${error_timestamp}`,
        `Guild: ${message.guild.name} (${message.guild.id})`,
        `Channel: #${message.channel.name} (${message.channel.id})`,
        `User: @${message.author.tag} (${message.author.id})`,
        `Command: ${message}`,
        `${error}`,
        `----------------------------------------------------------------------------------------------------------------\n`
    ].join('\n'), (errorWhileLoggingToFile) => {
        if (errorWhileLoggingToFile) throw errorWhileLoggingToFile;
    });
}

module.exports = {
    logUserError,
};