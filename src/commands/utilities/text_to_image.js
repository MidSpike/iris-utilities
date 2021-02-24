'use strict';

//#region dependencies
const fs = require('fs');
const path = require('path');
const nodeHtmlToImage = require('node-html-to-image');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

/**
 * Escape un-unwanted html
 * @param {String} text 
 * @returns {String} 
 */
function escapeHTML(text) {
    return text.replace(`&`, '&amp;')
               .replace(`"`, '&quot;')
               .replace(`'`, '&apos;')
               .replace(`\``, '&grave;')
               .replace(`<`, '&lt;')
               .replace(`>`, '&gt;')
               .replace(`/`, '&#47;')
               .replace(`\\`, '&#92;');
}

/**
 * Escape un-unwanted css properties
 * @param {String} text 
 * @returns {String} 
 */
function escapeCSSProperty(text) {
    return text.replace(/([^a-zA-Z\-])/gi, ''); // anything not an alpha character nor a '-'
}

/**
 * Escape un-unwanted css values
 * @param {String} text 
 * @returns {String} 
 */
function escapeCSSValue(text) {
    return text.replace(/((\:(?!\/\/))|((?<!\:)\/\/))/gi, '') // removes any ':' or '/' unless it is '://'
               .replace(/(\\|\<|\>|\;|\'|\")/gi, '') // removes any '\', '<', '>', ';', `'`, '"'
               .replace(/(\`|\~|\!|\@|\$|\^|\*|\(|\))/gi, ''); // removes any '`', '~', '!', '@', '$', '^', '*', '(', ')'
}

module.exports = new DisBotCommand({
    name: 'TEXT_TO_IMAGE',
    category: `${DisBotCommander.categories.UTILITIES}`,
    description: 'converts text to an image',
    aliases: ['text_to_image', 'tti'],
    cooldown: 5_000,
    access_level: DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;

        const user_raw_args_start_end_regex = /(format(\s*?)\{|\})/i;
        const user_raw_args_regex = /(format(\s*?)\{(.|\s)*?\})/i;
        const user_raw_args = message.cleanContent.match(user_raw_args_regex)?.[0] ?? '';
        // console.log({user_raw_args});

        // const user_args_invalid_regex = /([^a-z0-9\#\_\-])/gi;
        
        const user_args = user_raw_args.replace(user_raw_args_start_end_regex, '').trim().split(';').map(kv => {
            const kv_split_by_colons = kv.split(':');
            const k = escapeCSSProperty(kv_split_by_colons.slice(0, 1).join(':').trim());
            const v = escapeCSSValue(kv_split_by_colons.slice(1).join(':').trim());
            // console.log({ kv_split_by_colons, kv, k, v });
            return [k, v];
        });
        // console.log({user_args});
        
        const user_args_map = new Map(user_args);
        // console.log({ user_args_map });

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
                        value: [
                            `${'```'}`,
                                `${discord_command} format {`,
                                ` import-google-font: Inconsola;`,
                                ` bg-color: #000000;`,
                                ` text-align: center;`,
                                ` text-shadow-color: #000000;`,
                                ` text-color: #FFFFFF;`,
                                ` text-size: 56px;`,
                                ` text-weight: 700;`,
                                ` text-font: Inconsola;`,
                                ` image-url: ${process.env.BOT_CDN_URL}/doge-static.jpg;`,
                                `}`,
                                ``,
                                `Hello world! :)`,
                                ``,
                                ``,
                                ``,
                                ``,
                                ``,
                                `I'm a happy dog!`,
                            `${'```'}`,
                            `The \`format\` options consist of pseudo-css properties and values...`,
                            'This means that any pseudo-css-property that resembles a valid css-property; can in fact, accept corresponding acceptable css-values.',
                        ].join('\n'),
                    }, {
                        name: 'Text-To-Image Format Options',
                        value: [
                            `${'```'}`,
                                `import-google-font: <google-font-name>;`,
                                `image-url: <url>;`,
                                `image-repeat: <css-background-repeat>;`,
                                `image-size: <css-background-size>;`,
                                `image-position: <css-background-position>;`,
                                `bg-color: <css-color>;`,
                                `text-color: <css-color>;`,
                                `text-shadow-color: <css-color>;`,
                                `text-size: <css-font-size>;`,
                                `text-weight: <css-font-weight>;`,
                                `text-font: <css-font-family>;`,
                                `text-align: <css-text-alignment>;`,
                            `${'```'}`,
                        ].join('\n'),
                    },
                ],
            }, message));
            return;
        }

        const html_for_image = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=${user_args_map.get('import-google-font') ?? 'Inconsola'}&display=swap');
                        * {
                            box-sizing: border-box;
                        }
                        html {
                            display: flex;
                            width: auto;
                            height: auto;
                        }
                        body {
                            width: auto;
                            height: auto;
                        }
                        div {
                            padding: 0.25em 0.5em;
                            background-color: ${user_args_map.get('bg-color') ?? '#7289da'};
                            background-image: ${user_args_map.has('image-url') ? `url("${user_args_map.get('image-url')}")` : 'unset'};
                            background-repeat: ${user_args_map.get('image-repeat') ?? 'no-repeat'};
                            background-size: ${user_args_map.get('image-size') ?? 'cover'};
                            background-position: ${user_args_map.get('image-position') ?? '50% 50%'};
                            text-align: ${user_args_map.get('text-align') ?? 'left'};
                            text-shadow: 4px 3px 0 ${user_args_map.get('text-shadow-color') ?? '#555555'};
                            color: ${user_args_map.get('text-color') ?? '#ffffff'};
                            font-size: ${user_args_map.get('text-size') ?? '24px'};
                            font-weight: ${user_args_map.get('text-weight') ?? '900'};
                            font-family: ${user_args_map.get('text-font') ?? '"Inconsola", monospace'};
                            word-wrap: break-word;
                            white-space: pre;
                        }
                    </style>
                </head>
                <body>
                    <div>${text_for_image}</div>
                </body>
                <script>
                    /* wait a bit for the images to load */
                    setTimeout(() => {}, 1000);
                </script>
            </html>
        `;

        // console.log({ html_for_image });

        const image = await nodeHtmlToImage({
            type: 'png',
            encoding: 'binary',
            html: html_for_image,
            waitUntil: 'load',
            async beforeScreenshot() {
                /* wait a bit for the images to load */
                await Timer(1000);
                return;
            },
        });

        const temp_file_path = path.join(process.cwd(), 'temporary', `Text-To-Image_${Date.now()}.png`);
        fs.writeFileSync(temp_file_path, image, { flag: 'w' });

        const temp_file_read_stream = fs.createReadStream(temp_file_path);
        const message_attachment = new Discord.MessageAttachment(temp_file_read_stream);

        await message.channel.send(`${message.author}, here you go!`, message_attachment).catch(console.warn);

        fs.unlinkSync(temp_file_path);
    },
});
