const Discord = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

const client = new Discord.Client({partials:['MESSAGE', 'CHANNEL', 'REACTION']});
client.login(process.env.BOT_DISCORD_API_TOKEN);

module.exports = {
    Discord,
    client,
};
