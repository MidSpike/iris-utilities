'use strict';

//#region local dependencies
const dogeify = require('dogeify-js');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'DOGEIFY',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Dogeify text',
    aliases:['dogeify'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;
        const user_text = clean_command_args.join(' ');
        if (user_text.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Couldn't dogeify:`,
                description:`Try typing a sentence after the command!`,
                thumbnail:`${bot_cdn_url}/doge-static.gif`
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Dogeifying:',
                description:`\`\`\`${user_text}\`\`\``,
                image:`${bot_cdn_url}/doge-animated.gif`
            }, message)).then(bot_message => {
                dogeify(user_text).then(dogeified_text => {
                    client.setTimeout(() => {
                        bot_message.edit(new CustomRichEmbed({
                            title:'Dogeified',
                            description:`\`\`\`${user_text}\`\`\`into\`\`\`${dogeified_text}\`\`\``,
                            thumbnail:`${bot_cdn_url}/doge-static.jpg`
                        }, message));
                    }, 3500);
                });
            });
        }
    },
});
