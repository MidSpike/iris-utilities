'use strict';

//#region local dependencies
const axios = require('axios');
const validator = require('validator');

const { forcePromise } = require('../../utilities.js');

const { disBotServers } = require('../../src/SHARED_VARIABLES.js');
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { QueueItem, QueueItemPlayer } = require('../../src/QueueManager.js');
const { createConnection } = require('../../src/createConnection.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { playYouTube } = require('../../src/youtube.js');

const bot_cdn_url = process.env.BOT_CDN_URL;
//#endregion local dependencies

function detect_unsupported_play_input(search_query) {
    if (search_query.includes('spotify.com/')) {
        return true;
    } else if (search_query.includes('soundcloud.com/')) {
        return true;
    } else if (search_query.includes('twitter.com/')) {
        return true;
    } else if (search_query.includes('facebook.com/')) {
        return true;
    } else {
        return false;
    }
}

async function detect_remote_mp3(search_query='') {
    const ends_with_dot_mp3 = search_query.endsWith('.mp3');
    if (ends_with_dot_mp3) {
        return true;
    } else if (validator.isURL(search_query)) {// start mime-check on remote resource
        try {
            const response_to_url = await forcePromise(axios.head(search_query), 1000, undefined);
            const content_type = response_to_url?.headers?.['content-type'];
            const is_audio_mpeg = content_type === 'audio/mpeg';
            return is_audio_mpeg;
        } catch {
            return false;
        }
    } else {
        return false;
    }
}

async function playRemoteMP3(message, remote_mp3_path, playnext=false) {
    const server = disBotServers[message.guild.id];
    const voice_connection = await createConnection(message.member.voice.channel);
    const stream_maker = () => `${remote_mp3_path}`;
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, stream_maker, 1.0, () => {
        message.channel.send(new CustomRichEmbed({
            title:'Playing A MP3 File From The Internet',
            description:`${'```'}\n${remote_mp3_path}\n${'```'}`
        }, message));
    }, () => {}, (error) => {
        console.trace(error);
    });
    server.queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name:`${remote_mp3_path}`}), (playnext ? 2 : undefined)).then(() => {
        if (server.queue_manager.queue.length > 1) {
            message.channel.send(new CustomRichEmbed({
                title:'Added A MP3 File From The Internet',
                description:`${'```'}\n${remote_mp3_path}\n${'```'}`
            }, message));
        }
    });
}

async function playUserUploadedMP3(message, playnext=false) {
    const server = disBotServers[message.guild.id];
    const message_media = message.attachments.first();
    if (message_media) {
        if (message_media.attachment.endsWith('.mp3')) {
            const voice_connection = await createConnection(message.member.voice.channel);
            const stream_maker = () => `${message_media.attachment}`;
            const player = new QueueItemPlayer(server.queue_manager, voice_connection, stream_maker, 1.0, () => {
                message.channel.send(new CustomRichEmbed({
                    title:'Playing A MP3 File From Their Computer',
                    description:`${'```'}\n${message_media.name}${'```'}`
                }, message));
            }, () => {
                if (message.deletable) {
                    message.delete({timeout:500}).catch(null);
                }
            }, (error) => {
                console.trace(error);
            });
            server.queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name:`${message_media.name}`}), (playnext ? 2 : undefined)).then(() => {
                if (server.queue_manager.queue.length > 1) {
                    message.channel.send(new CustomRichEmbed({
                        title:'Added A MP3 File From Their Computer',
                        description:`${'```'}\n${message_media.name}${'```'}`
                    }, message));
                }
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Uh Oh!',
                description:`I wasn't able to play that mp3 file (if it even was one)!`
            }, message));
        }
    } else {
        message.channel.send(new CustomRichEmbed({
            color:0xFFFF00,
            title:'Did someone try playing an MP3?',
            description:`Its kinda hard to play an MP3 without one...\nNext time upload an mp3 in the same message!`
        }, message));
    }
}

function detect_broadcastify(search_query='') {
    const is_broadcastify_url = !!search_query.match('https://www.broadcastify.com/webPlayer/')?.[0];
    return is_broadcastify_url;
}

async function playBroadcastify(message, search_query, playnext=false) {
    const server = disBotServers[message.guild.id];
    const broadcast_id = search_query.match(/(\d+)/)?.[0]; // ID should be numbers only
    if (!broadcast_id) return;
    const broadcast_url = `https://broadcastify.cdnstream1.com/${broadcast_id}`;
    const voice_connection = await createConnection(message.member.voice.channel);
    const streamMaker = async () => await `${broadcast_url}`;
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, streamMaker, 1.5, () => {
        message.channel.send(new CustomRichEmbed({
            title:'Playing Broadcastify Stream',
            description:`[Stream Link - ${broadcast_id}](${broadcast_url})`
        }, message));
    }, () => {}, (error) => {
        console.trace(error);
    });
    server.queue_manager.addItem(new QueueItem('other', player, `Broadcastify Stream`), (playnext ? 2 : undefined)).then(() => {
        if (server.queue_manager.queue.length > 1) {
            message.channel.send(new CustomRichEmbed({
                title:'Added Broadcastify Stream',
                description:`[Stream Link - ${broadcast_id}](${broadcast_url})`
            }, message));
        }
    });
}

module.exports = new DisBotCommand({
    name:'PLAY',
    category:`${DisBotCommander.categories.MUSIC}`,
    description:'play music from youtube and more',
    aliases:[`play`, `p`, `playnext`, `pn`, ``],
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;
        const playnext = [`${command_prefix}playnext`, `${command_prefix}pn`].includes(discord_command);

        if (!message.member?.voice?.channel) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Whoops!',
                description:'You need to be in a voice channel to use this command!'
            }, message));
            return;
        }

        if (detect_unsupported_play_input(command_args.join(' '))) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Sorry playing music from that website isn't supported!`,
                description:`Use \`${discord_command}\` to see how to use this command.`
            }));
        } else if (message.attachments.first()?.attachment?.endsWith('.mp3')) {
            playUserUploadedMP3(message, playnext);
        } else if (command_args.join('').length > 0) {
            if (await detect_remote_mp3(command_args.join(' '))) {
                playRemoteMP3(message, command_args.join(' '), playnext);
            } else if (detect_broadcastify(command_args.join(' '))) {
                playBroadcastify(message, command_args.join(' '), playnext);
            } else {
                playYouTube(message, command_args.join(' '), playnext);
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`That's just not how you use this command!`,
                description:`Take a look below to see how you should have done it!`,
                fields:[
                    {name:'Playing Videos From YouTube:', value:`${'```'}\n${discord_command} ussr national anthem\n${'```'}${'```'}\n${discord_command} https://youtu.be/U06jlgpMtQs\n${'```'}`},
                    {name:'Playing Playlists From YouTube:', value:`${'```'}\n${discord_command} https://www.youtube.com/watch?v=CJHJAzVXvgk&list=OLAK5uy_nkeSq0KxbS-AoMa0j5Oh2d4IAkACXsrBI&index=1\n${'```'}${'```'}\n${discord_command} https://www.youtube.com/playlist?list=OLAK5uy_nkeSq0KxbS-AoMa0j5Oh2d4IAkACXsrBI\n${'```'}`},
                    {name:'Playing Broadcastify URLs:', value:`${'```'}\n${discord_command} https://www.broadcastify.com/webPlayer/22380\n${'```'}`},
                    {name:'Playing MP3 Files From The Internet:', value:`${'```'}\n${discord_command} ${bot_cdn_url}/the-purge.mp3\n${'```'}`},
                    {name:'Playing MP3 Files From Your Computer:', value:`${'```'}\n${discord_command}\n${'```'}(Don't forget to attach the .mp3 file to the message)`}
                ],
                image:`${bot_cdn_url}/mp3_command_usage.png`
            }, message));
        }
    },
});
