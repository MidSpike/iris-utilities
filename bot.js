//#region Environment
require('dotenv').config();
//#endregion Environment

const fs = require('fs');

const Discord = require('discord.js');
const client = new Discord.Client({partials:['MESSAGE', 'CHANNEL', 'REACTION']});
// client.login(JSON.parse(fs.readFileSync('./private/private-keys.json')).discord_client_token);
client.login(process.env.BOT_TOKEN);

module.exports = {
    Discord,
    client,
};