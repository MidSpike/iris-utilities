'use strict';

//#region local dependencies
const htmlEntitiesParser = require('html-entities');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { removeUserReactionsFromMessage,
        sendOptionsMessage } = require('../../libs/messages.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
const { forceYouTubeSearch,
        playYouTube } = require('../../libs/youtube.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SEARCH',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:2,
    description:'Searches YouTube for music to play and displays a list of playable things',
    aliases:['search'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        const search_query = command_args.join(' ').trim();
        if (search_query.length > 0) {
            const search_results = await forceYouTubeSearch(search_query, 9);
            const reactions = search_results.map((search_result, index) => ({
                emoji_name:`bot_emoji_${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][index+1]}`,
                callback(options_message, collected_reaction, user) {
                    removeUserReactionsFromMessage(options_message);
                    options_message.delete({timeout:10000}).catch(console.warn);
                    playYouTube(message, `${search_result.link}`);
                }
            }));
            const embed = new CustomRichEmbed({
                title: 'Pick an item to play it!',
                description: search_results.map((result, index) => {
                    const full_video_title = htmlEntitiesParser.decode(result.title);
                    const small_video_title = full_video_title.slice(0, 100);
                    const small_video_title_needed = small_video_title.length < full_video_title.length;
                    const video_title = small_video_title_needed ? `${small_video_title}...` : full_video_title;
                    const channel_section = `[${result.channelTitle}](https://youtube.com/channel/${result.channelId})`;
                    const title_section = `[${video_title}](https://youtu.be/${result.id})`;
                    return `${constructNumberUsingEmoji(index+1)} — ${channel_section}\n${title_section}`
                }).join('\n\n')
            }, message);
            const bot_message = await sendOptionsMessage(message.channel.id, embed, reactions, message.author.id);
            client.setTimeout(() => { // Wait 2 minutes before removing the search menu
                if (bot_message.deletable) bot_message.delete({timeout:500}).catch(console.warn);
            }, 1000 * 60 * 2);
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Woah there!`,
                description:`Try adding something after \`${discord_command}\` next time!`
            }, message));
        }
    },
});
