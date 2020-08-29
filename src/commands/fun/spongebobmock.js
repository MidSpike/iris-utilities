'use strict';

//#region local dependencies
const axios = require('axios');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;
const bot_api_url = process.env.BOT_API_SERVER_URL;

module.exports = new DisBotCommand({
    name:'SPONGEBOBMOCK',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Spongebob mock text',
    aliases:['spongebobmock'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, clean_command_args } = opts;

        const user_text = clean_command_args.join(' ');

        if (user_text.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Couldn't Spongebob Mock:`,
                description:`Try typing a sentence after the command!`,
                fields:[
                    {name:'Example Usage', value:`${discord_command} Spongebob is going to mock me!`}
                ]
            }, message));
        } else {
            const bot_message = await message.channel.send(new CustomRichEmbed({
                title:'Generating Spongebob Mock...',
                description:`${'```'}\n${user_text}\n${'```'}`,
                image:`${bot_cdn_url}/spongebob-mocking-animated.gif`
            }, message));

            const api_response = await axios.get(`${bot_api_url}/spmock?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&text=${encodeURIComponent(user_text)}`);

            const { original_text,
                    spmock_text } = api_response.data;

            await Timer(1500);

            bot_message.edit(new CustomRichEmbed({
                title:'Generated Spongebob Mock',
                description:`Told SpongeBob to mock this:${'```'}\n${original_text}\n${'```'}\ninto the following:\n${'```'}\n${spmock_text}\n${'```'}`,
                thumbnail:`${bot_cdn_url}/spongebob-mocking.png`
            }, message));
        }
    },
});
