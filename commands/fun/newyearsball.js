'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'NEWYEARSBALL',
    category:`${DisBotCommander.categories.FUN}`,
    description:'newyearsball',
    aliases:['newyearsball'],
    async executor(Discord, client, message, opts={}) {
        const ball_message = await message.channel.send(new CustomRichEmbed({
            title:`Preparing New Years Ball`
        }, message));
        for (let ball_number = 1; ball_number <= 11; ball_number++) {
            const ball_path = path.join(process.cwd(), `./files/new_years_ball/ball_${ball_number}.txt`);
            const ball_art = fs.readFileSync(ball_path).toString();
            await ball_message.edit(new CustomRichEmbed({
                title:`Ball ${ball_number}`,
                description:`${'```'}\n${ball_art}\n${'```'}`
            }));
            await Timer(1000);
        }
    },
});
