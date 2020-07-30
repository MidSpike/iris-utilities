//#region Environment
require('dotenv').config();
//#endregion Environment

const Discord = require('discord.js');
const client = new Discord.Client({partials:['MESSAGE', 'CHANNEL', 'REACTION']});
client.login(process.env.BOT_TOKEN);

module.exports = {
    Discord,
    client,
};