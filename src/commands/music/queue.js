'use strict';

//#region local dependencies
const { array_chunks, string_ellipses } = require('../../utilities.js');

const { disBotServers } = require('../../SHARED_VARIABLES.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { removeUserReactionsFromMessage, sendOptionsMessage } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'QUEUE',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:10,
    description:'used for controlling the queue',
    aliases:['queue', 'q'],
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;
        const { queue_manager } = disBotServers[message.guild.id];
        if (queue_manager.queue.length > 0) {
            if (command_args.length > 0) {
                if (['items', 'i'].includes(command_args[0])) {
                    const queue_page_size = 10;
                    let page_index = 0;
                    let queue_pages = [];
                    function makeQueueEmbed() {
                        const entire_queue_formatted = queue_manager.queue.map((queue_item, index) => {
                            if (queue_item.type === 'youtube') {
                                const yt_video_title = `${string_ellipses(queue_item.metadata.videoInfo.videoDetails.title, 50)}`;
                                const yt_video_link = `https://youtu.be/${queue_item.metadata.videoInfo.videoDetails.videoId}`;
                                const yt_channel_title = `${string_ellipses(queue_item.metadata.videoInfo.videoDetails.author.name, 50)}`;
                                const yt_channel_link = `${queue_item.metadata.videoInfo.videoDetails.author.channel_url}`;
                                return {
                                    name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value:`[${yt_video_title}](${yt_video_link}) by [${yt_channel_title}](${yt_channel_link})`
                                };
                            } else if (queue_item.type === 'tts') {
                                return {
                                    name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value:`${string_ellipses(queue_item.metadata.text, 50)}`
                                };
                            } else if (queue_item.type === 'mp3') {
                                return {
                                    name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value:`${string_ellipses(queue_item.metadata.mp3_file_name, 50)}`
                                };
                            } else {
                                return {
                                    name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value:`Unknown Content`
                                };
                            }
                        });
                        queue_pages = array_chunks(entire_queue_formatted, queue_page_size);
                        if (queue_pages[page_index]) {// The queue is populated
                            return new CustomRichEmbed({
                                title:`Requested The Queue`,
                                description:`There are currently ${queue_manager.queue.length} items in the queue.\nCurrently on queue page: \`[ ${page_index+1} ]\` of \`[ ${queue_pages.length} ]\`.`,
                                fields:[...queue_pages[page_index]]
                            }, message);
                        } else {// The queue is not populated
                            return new CustomRichEmbed({
                                title:`Requested The Queue`,
                                description:`The queue is currently empty!`
                            }, message);
                        }
                    }
                    sendOptionsMessage(message.channel.id, makeQueueEmbed(), [
                        {
                            emoji_name:'bot_emoji_angle_left',
                            callback(options_message, collected_reaction, user) {
                                removeUserReactionsFromMessage(options_message);
                                page_index--;
                                if (page_index < 0) {page_index = queue_pages.length-1;}
                                options_message.edit(makeQueueEmbed());
                            }
                        }, {
                            emoji_name:'bot_emoji_angle_right',
                            callback(options_message, collected_reaction, user) {
                                removeUserReactionsFromMessage(options_message);
                                page_index++;
                                if (page_index > queue_pages.length-1) {page_index = 0;}
                                options_message.edit(makeQueueEmbed());
                            }
                        }
                    ]);
                } else if (['autoplay', 'a'].includes(command_args[0])) {
                    await queue_manager.toggleAutoplay();
                    message.channel.send(new CustomRichEmbed({title:`${queue_manager.autoplay_enabled ? 'Enabled' : 'Disabled'} Autoplay Of Related YouTube Videos In The Queue`}, message));
                } else if (['loop', 'l'].includes(command_args[0])) {
                    if (['item', 'i'].includes(command_args[1])) {
                        await queue_manager.toggleLoop();
                        await queue_manager.setLoopType('single');
                        message.channel.send(new CustomRichEmbed({title:`${queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} Queue Looping For The First Item`}, message));
                    } else if (['all', 'a'].includes(command_args[1])) {
                        await queue_manager.toggleLoop();
                        await queue_manager.setLoopType('multiple');
                        message.channel.send(new CustomRichEmbed({title:`${queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} Queue Looping For The Entire Queue`}, message));
                    } else if (['shuffle', 's'].includes(command_args[1])) {
                        await queue_manager.toggleLoop();
                        await queue_manager.setLoopType('shuffle');
                        message.channel.send(new CustomRichEmbed({title:`${queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} Queue Shuffle Looping For The Entire Queue`}, message));
                    } else {
                        message.channel.send(new CustomRichEmbed({
                            title:'Possible Queue Loop Commands',
                            description:`${'```'}\n${['i | item', 'a | all', 's | shuffle'].map(item => `${discord_command} ${command_args[0]} [ ${item} ]`).join('\n')}${'```'}`
                        }, message));
                    }
                } else if (['shuffle', 's'].includes(command_args[0])) {
                    await queue_manager.shuffleItems();
                    message.channel.send(new CustomRichEmbed({title:`Shuffled Items In The Queue`}, message));
                } else if (['remove', 'r'].includes(command_args[0])) {
                    if (command_args[1]) {
                        const remove_index_number = parseInt(command_args[1]);
                        if (!isNaN(remove_index_number)) {
                            queue_manager.removeItem(remove_index_number);
                            message.channel.send(new CustomRichEmbed({title:`Removed An Item From The Queue`, description:`Removed item at position #${remove_index_number}!`}, message));
                        } else {
                            message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Woah dude!`, description:`I can't remove ${remove_index_number} from the queue!\nTry specifying a number!`}, message));
                        }
                    } else {
                        message.channel.send(new CustomRichEmbed({
                            title:`Here's How To Remove Items From The Queue`,
                            description:`Simply specify the index of the song!\nExample Usage:${'```'}\n${discord_command} ${command_args[0]} 2${'```'}The above will remove the 2nd item in the queue.`
                        }, message));
                    }
                } else if (['clear', 'c'].includes(command_args[0])) {
                    message.channel.send(new CustomRichEmbed({title:`Removed ${queue_manager.queue.length-1} Uninvoked Items From The Queue`}, message));
                    queue_manager.clearItems(false);
                }
            } else {//Show the queue commands
                message.channel.send(new CustomRichEmbed({
                    title:'Possible Queue Commands',
                    description:`${'```'}\n${['items | i', 'loop | l', 'shuffle | s', 'remove | r', 'clear | c'].map(item => `${discord_command} [ ${item} ]`).join('\n')}${'```'}`
                }, message));
            }
        } else {//Nothing is in the Queue
            message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Does Not Compute! The Queue Is Empty!`, description:'What were you trying to do there?'}, message));
        }
    },
});
