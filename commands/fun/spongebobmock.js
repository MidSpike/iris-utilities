'use strict';

//#region local dependencies
const axios = require('axios');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;
const bot_api_url = process.env.BOT_API_SERVER_URL;

module.exports = new DisBotCommand({
    name:'SPONGEBOBMOCK',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Spongebob mock text',
    aliases:['spongebobmock'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;
        const user_text = clean_command_args.join(' ');
        if (user_text.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Couldn't Spongebob Mock:`,
                description:`Try typing a sentence after the command!`
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Generating Spongebob Mock:',
                description:`\`\`\`${user_text}\`\`\``,
                image:`${bot_cdn_url}/spongebob-mocking-animated.gif`
            }, message)).then(bot_message => {
                axios.get(`${bot_api_url}/spmock?text=${encodeURIComponent(user_text)}`).then(res => {
                    if (res.data) {
                        client.setTimeout(() => {
                            bot_message.edit(new CustomRichEmbed({
                                title:'Generated Spongebob Mock',
                                description:`\`\`\`${res.data?.original_text}\`\`\`into\`\`\`${res.data?.spmock_text}\`\`\``,
                                thumbnail:`${bot_cdn_url}/spongebob-mocking.png`
                            }, message));
                        }, 3500);
                    }
                });
            });
        }
    },
});
