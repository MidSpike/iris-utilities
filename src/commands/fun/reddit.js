'use strict';

//#region local dependencies
const axios = require('axios');

const { sendOptionsMessage, removeUserReactionsFromMessage } = require('../../libs/messages.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'REDDIT',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Reddit Search',
    aliases:['reddit'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;
        if (!message.channel.nsfw) {
            message.channel.send(new CustomRichEmbed({
                title:'This command requires an NSFW channel!',
                description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
            }, message));
            return;
        }
        const subreddit_to_lookup = clean_command_args[0]?.replace('/r', '');
        axios.post(`https://www.reddit.com/r/${subreddit_to_lookup??'funny'}/top.json?limit=100`).then(response => {
            const reddit_posts = response.data.data.children.map(post => post.data);
            let page_index = 0;
            function makeEmbed() {
                const reddit_post = reddit_posts[page_index];
                console.log({reddit_post});
                return new CustomRichEmbed({
                    author:{iconURL:`${bot_cdn_url}/reddit-logo.png`, name:`Reddit ${page_index+1}/${reddit_posts.length}`},
                    title:reddit_post.title,
                    description:`https://www.reddit.com${reddit_post.permalink}`,
                    // image:(reddit_post.url.startsWith('https://i') ? reddit_post.url : null)
                    image:(reddit_post.thumbnail ?? null)
                }, message);
            }
            sendOptionsMessage(message.channel.id, makeEmbed(), [
                {
                    emoji_name:'bot_emoji_angle_left',
                    callback(options_message, collected_reaction, user) {
                        removeUserReactionsFromMessage(options_message);
                        page_index--;
                        if (page_index < 0) {page_index = reddit_posts.length-1;}
                        options_message.edit(makeEmbed());
                    }
                }, {
                    emoji_name:'bot_emoji_angle_right',
                    callback(options_message, collected_reaction, user) {
                        removeUserReactionsFromMessage(options_message);
                        page_index++;
                        if (page_index > reddit_posts.length-1) {page_index = 0;}
                        options_message.edit(makeEmbed());
                    }
                }
            ]);
        }).catch((error) => {
            console.trace(error);
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Have you even used reddit?',
                description:`\`${subreddit_to_lookup ?? ''}\` isn't a valid subreddit!`
            }, message));
        });
    },
});
