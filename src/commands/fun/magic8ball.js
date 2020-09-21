'use strict';

//#region local dependencies
const { array_random } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const bot_config = require('../../../config.js');

const magic8ball_json = require('../../../files/8ball.json');
//#endregion local dependencies

const bot_common_name = bot_config.COMMON_NAME;
const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'MAGIC8BALL',
    category:`${DisBotCommander.categories.FUN}`,
    description:'magic8ball',
    aliases:['magic8ball'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;
        message.channel.send(new CustomRichEmbed({
            thumbnail:`${bot_cdn_url}/magic-8-ball.webp`,
            title:`${bot_common_name} - 8 Ball Wizard`,
            fields:[
                {name:`You said:`, value:`${'```'}\n${clean_command_args.join(' ')}${'```'}`},
                {name:`I say:`, value:`${'```'}\n${array_random(magic8ball_json)}${'```'}`}
            ]
        }, message));
    },
});
