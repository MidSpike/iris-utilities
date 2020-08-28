'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const bot_config = require('../../../config.json');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;
const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'DISCLAIMER',
    category:`${DisBotCommander.categories.INFO}`,
    weight:5,
    description:'Shows the user the legal disclaimer',
    aliases:['disclaimer'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        const legal_usage_disclaimer_file = path.join(process.cwd(), './files/disclaimer.txt');
        const legal_disclaimer = fs.readFileSync(legal_usage_disclaimer_file).toString();
        const legal_disclaimer_chunks = legal_disclaimer.split('\r\n\r\n');
        if (command_args[0] === 'no_attachments') {
            legal_disclaimer_chunks.forEach((legal_disclaimer_chunk, index) => {
                message.channel.send(new CustomRichEmbed({
                    title:`${bot_common_name} Legal Disclaimer Inbound! (Part ${index+1}/${legal_disclaimer_chunks.length})`,
                    description:`${'```'}\n${legal_disclaimer_chunk}\n${'```'}`
                }, message));
            });
        } else {
            const attachment = new Discord.MessageAttachment(legal_usage_disclaimer_file);
            await message.channel.send(new CustomRichEmbed({
                title:'Legal Disclaimer Inbound!',
                description:`You can also do \`${discord_command} no_attachments\` to see the disclaimer without downloading it!`,
                image:`${bot_cdn_url}/law-and-justice.jpg`
            }, message));
            message.channel.send({files:[attachment]});
        }
    },
});
