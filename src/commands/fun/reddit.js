'use strict';

//#region dependencies
const axios = require('axios');

const { sendOptionsMessage,
        removeUserReactionsFromMessage } = require('../../libs/messages.js');

const { sendPotentiallyNotSafeForWorkDisclaimer } = require('../../libs/messages.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'REDDIT',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Reddit Search',
    aliases: ['reddit'],
    async executor(Discord, client, message, opts={}) {
        const { clean_command_args } = opts;

        const potentially_nsfw_content_is_accepted = await sendPotentiallyNotSafeForWorkDisclaimer(message);
        if (!potentially_nsfw_content_is_accepted) return;

        const subreddit_to_lookup = clean_command_args[0]?.replace('/r', '');
        axios.post(`https://www.reddit.com/r/${subreddit_to_lookup??'funny'}/top.json?limit=100`).then(async (response) => {
            const reddit_posts = response.data.data.children.map(post => post.data);

            let page_index = 0;
            async function makeEmbed() {
                const reddit_post = reddit_posts[page_index];

                console.log({ reddit_post });

                const supported_mime_types = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                
                const post_redirection_url_response = await axios.head(reddit_post.url_overridden_by_dest);
                const post_redirection_url_mime_type = post_redirection_url_response.headers['content-type'].split(';')[0];

                console.log({
                    post_redirection_url_response,
                    post_redirection_url_mime_type,
                });

                console.log(`mime-type: ${post_redirection_url_mime_type}`);

                return new CustomRichEmbed({
                    author: {
                        iconURL: `${bot_cdn_url}/reddit-logo.png`,
                        name: `Reddit ${page_index+1}/${reddit_posts.length}`,
                    },
                    description: `[${reddit_post.title}](https://www.reddit.com${reddit_post.permalink})`,
                    // image:(reddit_post.thumbnail ?? null)
                    image: (supported_mime_types.includes(post_redirection_url_mime_type) ? reddit_post.url_overridden_by_dest : null),
                }, message);
            }

            sendOptionsMessage(message.channel.id, await makeEmbed(), [
                {
                    emoji_name: 'bot_emoji_angle_left',
                    async callback(options_message, collected_reaction, user) {
                        removeUserReactionsFromMessage(options_message);
                        page_index--;
                        if (page_index < 0) {page_index = reddit_posts.length-1;}
                        options_message.edit(await makeEmbed());
                    },
                }, {
                    emoji_name: 'bot_emoji_angle_right',
                    async callback(options_message, collected_reaction, user) {
                        removeUserReactionsFromMessage(options_message);
                        page_index++;
                        if (page_index > reddit_posts.length-1) {page_index = 0;}
                        options_message.edit(await makeEmbed());
                    },
                },
            ]);
        }).catch((error) => {
            console.trace(error);
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Have you even used reddit?',
                description: `\`${subreddit_to_lookup ?? ''}\` isn't a valid subreddit!`,
            }, message));
        });
    },
});
