'use strict';

//#region local dependencies
const validator = require('validator');

const bot_config = require('../../../config.json');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;
const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'EMBED',
    category:`${DisBotCommander.categories.UTILITIES}`,
    weight:4,
    description:'Create message embeds via command',
    aliases:['embed'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;
        if (message.content.replace(discord_command, ``).trim().length > 0) {
            try {
                let embed_segments_joined = message.content.replace(discord_command, ``);
                const regex_embed_args = /\{\{(.*?)\}\}/g;
                const regex_embed_args_bounds = /(\{\{|\}\})/g;
                const potential_embed_image = `${embed_segments_joined.match(regex_embed_args)?.[0]}`.replace(regex_embed_args_bounds, '');
                const embed_image = validator.isURL(potential_embed_image) ? potential_embed_image : undefined;
                embed_segments_joined = embed_segments_joined.replace(regex_embed_args, '').replace(regex_embed_args_bounds, '');
                const embed_segments = embed_segments_joined.split(`\n\n`);
                const embed_title_desctiption = embed_segments[0].split(`\n`);
                const embed_title = embed_title_desctiption[0];
                const embed_desctiption = embed_title_desctiption.slice(1).join('\n');
                const embed_fields = embed_segments.slice(1).map(field_joined => ({
                    name:`${field_joined.split('\n')[0]}`,
                    value:`${field_joined.split('\n')[1]}`
                }));
                // console.log({embed_segments, embed_title_desctiption, embed_title, embed_desctiption, embed_image, embed_fields});
                message.channel.send(new CustomRichEmbed({
                    color: 0x000000,
                    author:{iconURL:message.member.user.displayAvatarURL({dynamic:true}), name:`Sent by @${message.member.user.tag} (${message.member.user.id})`},
                    title:`${embed_title}`,
                    description:`${embed_desctiption}`,
                    image:embed_image,
                    fields:embed_fields,
                    footer:{iconURL:`${bot_cdn_url}/Warning_Sign_2020-07-08_1.png`, text:`This message is not from or endorsed by ${bot_common_name}!`}
                }));
            } catch (error) {
                console.trace(`Failed to send user-generated embed!`, error);
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`Whoops, something went wrong!`,
                    description:`Somehow you messed up making the embed and Discord didn't like it!`
                }, message));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`You can use this command to create embeds!`,
                description:[
                    `**Try out the following!**`,
                    `${'```'}`,
                    `${discord_command} The title can go here`,
                    `The description can go here,`,
                    `and continue over here as well,`,
                    `and can extend even more beyond here!`,
                    ``,
                    `A Field Title can go here`,
                    `A Field Description can go here`,
                    ``,
                    `Another Field Title can go here`,
                    `Another Field Description can go here`,
                    ``,
                    `{{The image URL goes inside of double semi-brackets!}}`,
                    `${'```'}`
                ].join('\n')
            }, message));
        }
    },
});
