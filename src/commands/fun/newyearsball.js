'use strict';

//#region dependencies
const fs = require('fs');
const path = require('path');

const { Timer } = require('../../utilities.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'NEWYEARSBALL',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'newyearsball',
    aliases: ['newyearsball', 'ball'],
    async executor(Discord, client, message, opts={}) {
        const ball_message = await message.channel.send({
            embed: new CustomRichEmbed({
                title: 'Preparing New Years Ball...',
            }, message),
        });

        await Timer(500); // prevent api abuse

        for (let ball_number = 1; ball_number <= 11; ball_number++) {
            const ball_path = path.join(process.cwd(), `./files/new_years_ball/ball_${ball_number}.txt`);
            const ball_art = fs.readFileSync(ball_path).toString();

            await ball_message.edit({
                embed: new CustomRichEmbed({
                    title: 'New Years Ball',
                    description: `${'```'}\n${ball_art}\n${'```'}`,
                }, message),
            });

            await Timer(2000); // prevent api abuse
        }
    },
});
