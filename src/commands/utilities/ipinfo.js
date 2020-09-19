'use strict';

//#region local dependencies
const axios = require('axios');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'IPINFO',
    category:`${DisBotCommander.categories.UTILITIES}`,
    weight:8,
    description:'IP Information',
    aliases:['ipinfo'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (command_args[0]) {
            axios.get(`http://ip-api.com/json/${command_args[0]}?fields=query,city,regionName,country,zip,isp,org`).then(res => {
                message.channel.send(new CustomRichEmbed({
                    title:`IP Info`,
                    description:`Found results for: ${res.data.query}!`,
                    fields:Object.keys(res.data).map((key) => [key, res.data[key]]).map(props => ({name:props[0], value:props[1] || 'not found'}))
                }, message));
            }).catch(console.trace);
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`You aren't trying to spy on people now, are you?`,
                description:`With great power, comes great responsibility. Stay legal my friend!`,
                thumbnail:`${bot_cdn_url}/encryption-lock-info.jpg`,
                fields:[
                    {name:'Command Usage', value:`\`\`\`${discord_command} IP_ADDRESS_HERE\`\`\``}
                ]
            }, message));
        }
    },
});
