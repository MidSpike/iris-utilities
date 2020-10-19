'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const nodeHtmlToImage = require('node-html-to-image');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

function escapeHTML(text) {
    return text.replace(`&`, '&amp;').replace(`"`, '&quot;').replace(`'`, '&apos;').replace(`\``, '&grave;').replace(`<`, '&lt;').replace(`>`, '&gt;').replace(`/`, '&#47;').replace(`\\`, '&#92;');
}

module.exports = new DisBotCommand({
    name: 'TEXT_TO_IMAGE',
    category: `${DisBotCommander.categories.UTILITIES}`,
    description: 'converts text to an image',
    aliases: ['text_to_image', 'tti'],
    access_level: DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;

        const user_raw_args_start_end_regex = /(format(\s*?)\{|\})/i;
        const user_raw_args_regex = /(format(\s*?)\{(.|\s)*?\})/i;
        const user_raw_args = message.cleanContent.match(user_raw_args_regex)?.[0] ?? '';
        console.log({user_raw_args});

        const user_args_invalid_regex = /([^a-z0-9\#\_\-])/gi;
        
        const user_args = user_raw_args.replace(user_raw_args_start_end_regex, '').trim().split(';').map(kv => 
            kv.split(':').map(i => 
                i.replace(user_args_invalid_regex, '').trim()
            )
        );
        console.log({user_args});
        
        const user_args_map = new Map(user_args);
        console.log({user_args_map});

        let text_for_image = message.cleanContent.replace(user_raw_args_regex, '').trim();
        text_for_image = escapeHTML(text_for_image.replace(discord_command, '')).trim().replace(/\r?\n|\r/g, '<br />');

        if (text_for_image.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'That\'s not how you use this command!',
                description: 'This command can create images from the text that you specify.',
                fields: [
                    {
                        name: 'Text-To-Image Simple Usage',
                        value: `${'```'}\n${discord_command} Hello World!\n${'```'}`,
                    }, {
                        name: 'Text-To-Image Advanced Usage',
                        value: `${'```'}\n${discord_command} format{\n bg-color: black;\n text-color: #FF5500;\n text-size: 24px;\n}\nHello World!\n${'```'}`,
                    },
                ],
            }, message));
            return;
        }

        const image = await nodeHtmlToImage({
            type: 'png',
            encoding: 'binary',
            html: (`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inconsola:wght@900&display=swap');
                            * {
                                box-sizing: border-box;
                            }
                            html {
                                display: flex;
                                width: auto;
                                height: auto;
                                max-width: 500px;
                                overflow: hidden;
                            }
                            body {
                                width: auto;
                                height: auto;
                                padding: 10px 15px;
                                background: ${user_args_map.get('bg-color') ?? '#7289da'};
                                color: ${user_args_map.get('text-color') ?? '#ffffff'};
                                font-size: ${user_args_map.get('text-size') ?? '20px'};
                                font-weight: 900;
                                font-family: 'Inconsola', monospace;
                            }
                            div {
                                word-wrap: break-word;
                                white-space: pre;
                            }
                        </style>
                    </head>
                    <body>
                        <div>${text_for_image}</div>
                    </body>
                </html>
            `),
        });

        const temp_file_path = path.join(process.cwd(), 'temporary', `Text-To-Image_${Date.now()}.png`);
        fs.writeFileSync(temp_file_path, image, { flag: 'w' });

        const temp_file_read_stream = fs.createReadStream(temp_file_path);
        const message_attachment = new Discord.MessageAttachment(temp_file_read_stream);

        await message.channel.send(`${message.author}, here you go!`, message_attachment).catch(console.warn);

        fs.unlinkSync(temp_file_path);
    },
});
