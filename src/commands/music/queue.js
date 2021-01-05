'use strict';

//#region local dependencies
const { array_chunks,
        string_ellipses } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendOptionsMessage,
        removeUserReactionsFromMessage } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'QUEUE',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 11,
    description: 'used for controlling the queue',
    aliases: ['queue', 'q'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length > 0) {
            if (command_args.length > 0) {
                if (['items', 'i'].includes(command_args[0])) {
                    const queue_page_size = 10;
                    let page_index = 0;
                    let queue_pages = [];
                    function makeQueueEmbed() {
                        const entire_queue_formatted = guild_queue_manager.queue.map((queue_item, index) => {
                            if (queue_item.type === 'youtube') {
                                const yt_video_title = `${string_ellipses(queue_item.metadata.videoInfo.videoDetails.title, 50)}`;
                                const yt_video_link = `https://youtu.be/${queue_item.metadata.videoInfo.videoDetails.videoId}`;
                                const yt_channel_title = `${string_ellipses(queue_item.metadata.videoInfo.videoDetails.author.name, 50)}`;
                                const yt_channel_link = `${queue_item.metadata.videoInfo.videoDetails.author.channel_url}`;
                                return {
                                    name: `[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value: `[${yt_video_title}](${yt_video_link}) by [${yt_channel_title}](${yt_channel_link})`,
                                };
                            } else if (queue_item.type === 'tts') {
                                return {
                                    name: `[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value: `${string_ellipses(queue_item.metadata.text, 50)}`,
                                };
                            } else if (queue_item.type === 'mp3') {
                                return {
                                    name: `[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value: `${string_ellipses(queue_item.metadata.mp3_file_name, 50)}`,
                                };
                            } else {
                                return {
                                    name: `[ ${index + 1} ] ${queue_item.type}`.toUpperCase(),
                                    value: `${string_ellipses(queue_item.description, 50)}`,
                                };
                            }
                        });
                        queue_pages = array_chunks(entire_queue_formatted, queue_page_size);
                        if (queue_pages[page_index]) {
                            /* the queue is populated */
                            return new CustomRichEmbed({
                                title: 'Requested the queue',
                                description: [
                                    `There are currently ${guild_queue_manager.queue.length} items in the queue.`,
                                    `Currently on queue page: \`[ ${page_index+1} ]\` of \`[ ${queue_pages.length} ]\`.`,
                                ].join('\n'),
                                fields: [
                                    ...queue_pages[page_index],
                                ],
                            }, message);
                        } else {
                            /* the queue is not populated */
                            return new CustomRichEmbed({
                                title: 'Requested the queue',
                                description: 'The queue is currently empty!',
                            }, message);
                        }
                    }
                    sendOptionsMessage(message.channel.id, makeQueueEmbed(), [
                        {
                            emoji_name: 'bot_emoji_angle_left',
                            callback(options_message, collected_reaction, user) {
                                removeUserReactionsFromMessage(options_message);
                                page_index--;
                                if (page_index < 0) {
                                    page_index = queue_pages.length - 1;
                                }
                                options_message.edit(makeQueueEmbed());
                            },
                        }, {
                            emoji_name: 'bot_emoji_angle_right',
                            callback(options_message, collected_reaction, user) {
                                removeUserReactionsFromMessage(options_message);
                                page_index++;
                                if (page_index > queue_pages.length-1) {
                                    page_index = 0;
                                }
                                options_message.edit(makeQueueEmbed());
                            },
                        }
                    ]);
                } else if (['autoplay', 'a'].includes(command_args[0])) {
                    await guild_queue_manager.toggleAutoplay();
                    message.channel.send(new CustomRichEmbed({
                        title: `${guild_queue_manager.autoplay_enabled ? 'Enabled' : 'Disabled'} autoplay of related youtube videos in the queue`,
                    }, message));
                } else if (['shuffle', 's'].includes(command_args[0])) {
                    await guild_queue_manager.shuffleItems();
                    message.channel.send(new CustomRichEmbed({
                        title: 'Shuffled all items in the queue',
                    }, message));
                } else if (['remove', 'r'].includes(command_args[0])) {
                    if (command_args[1]) {
                        const remove_index_number = parseInt(command_args[1]);
                        if (!isNaN(remove_index_number)) {
                            guild_queue_manager.removeItem(remove_index_number);
                            message.channel.send(new CustomRichEmbed({
                                title: 'Removed an item from the queue',
                                description: `Removed item at position #${remove_index_number}!`,
                            }, message));
                        } else {
                            message.channel.send(new CustomRichEmbed({
                                color: 0xFFFF00,
                                title: 'Woah dude!',
                                description: [
                                    `I can\'t remove ${remove_index_number} from the queue!`,
                                    'Try specifying a number!',
                                ].join('\n'),
                            }, message));
                        }
                    } else {
                        message.channel.send(new CustomRichEmbed({
                            title: 'This is how you can remove items from the queue',
                            description: [
                                'Simply specify the index of the song!',
                                `Example Usage: ${'```'}\n${discord_command} ${command_args[0]} 2\n${'```'}`,
                                'The above will remove the 2nd item in the queue.',
                            ].join('\n'),
                        }, message));
                    }
                } else if (['clear', 'c'].includes(command_args[0])) {
                    message.channel.send(new CustomRichEmbed({
                        title: `Removed ${guild_queue_manager.queue.length-1} uninvoked items from the queue`,
                    }, message));
                    guild_queue_manager.clearItems(false);
                }
            } else {
                /* show the queue commands */
                message.channel.send(new CustomRichEmbed({
                    title: 'Here are the possible queue sub-commands',
                    description: `${'```'}\n${['items | i', 'autoplay | a', 'shuffle | s', 'remove | r', 'clear | c'].map(item => `${discord_command} [ ${item} ]`).join('\n')}\n${'```'}`,
                }, message));
            }
        } else {
            /* nothing is in the queue */
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'The queue is empty!',
                description: 'What were you trying to do there?',
            }, message));
        }
    },
});
