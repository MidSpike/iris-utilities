'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueryType } = require('discord-player');

const { delay } = require('../../../common/lib/utilities');
const { CustomEmbed } = require('../../../common/app/message');
const { AudioManager, VolumeManager } = require('../../../common/app/audio');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'play',
    description: 'n/a',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
    options: [
        {
            type: 'STRING',
            name: 'query',
            description: 'the query to search',
            required: true,
        }, {
            type: 'BOOLEAN',
            name: 'playnext',
            description: 'whether to play next',
            required: false,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
        Discord.Permissions.FLAGS.CONNECT,
        Discord.Permissions.FLAGS.SPEAK,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        const guild_member_voice_channel_id = command_interaction.member.voice.channelId;
        const bot_voice_channel_id = command_interaction.guild.me.voice.channelId;

        if (!guild_member_voice_channel_id) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, you must be in the same voice channel as me.`,
                    }),
                ],
            });
        }

        const query = command_interaction.options.get('query').value;
        const playnext = command_interaction.options.get('playnext')?.value ?? false;

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        player.removeAllListeners('botDisconnect');
        player.once('botDisconnect', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: 'I was disconnected from the voice channel, cleared the queue!',
                    }),
                ],
            });
        });

        player.removeAllListeners('channelEmpty');
        player.once('channelEmpty', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: 'Nobody is in the voice channel, leaving...',
                    }),
                ],
            });
        });

        player.removeAllListeners('queueEnd');
        player.once('queueEnd', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: 'Queue ended!',
                    }),
                ],
            });
        });

        player.removeAllListeners('trackAdd');
        player.once('trackAdd', (queue, track) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: `${queue.metadata.user}, added **[${track.title}](${track.url})** to the queue!`,
                    }),
                ],
            });
        });

        player.removeAllListeners('trackStart');
        player.once('trackStart', (queue, track) => {
            console.log(track, track.thumbnail);
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        thumbnail: {
                            url: track.thumbnail,
                        },
                        description: [
                            `Now playing: **[${track.title}](${track.url})**`,
                            `Requested by: ${queue.metadata.user}`,
                        ].join('\n'),
                    }),
                ],
            });
        });

        const search_result = await player.search(query, {
            requestedBy: command_interaction.user,
            searchEngine: QueryType.AUTO,
        }).catch(() => {});

        if (!search_result?.tracks?.length) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, I couldn't find anything for **${query}**.`,
                    }),
                ],
            });
        }

        const queue = await player.createQueue(command_interaction.guildId, {
            metadata: command_interaction,
            enableLive: true,
            initialVolume: 1, // this line possibly does nothing, but might be needed
            useSafeSearch: false,
            bufferingTimeout: 5_000,
            leaveOnEnd: true,
            leaveOnStop: false,
            leaveOnEmpty: false,
            leaveOnEmptyCooldown: 5 * 60_000,
            ytdlOptions: {
                lang: 'en',
                filter: 'audioonly',
                highWaterMark: 1<<25,
                requestOptions: {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.5',
                        'User-Agent': process.env.YTDL_USER_AGENT,
                        'Cookie': process.env.YTDL_COOKIE,
                        'x-youtube-identity-token': process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN,
                    },
                },
            },
        });

        if (!queue.connection) {
            try {
                await queue.connect(command_interaction.member.voice.channelId);
            } catch (error) {
                console.trace(`Failed to connect to the voice channel: ${error.message}`, error);
                player.deleteQueue(command_interaction.guildId);
                return command_interaction.followUp({
                    embeds: [
                        new CustomEmbed({
                            description: `${command_interaction.user}, I was unable to join your voice channel!`,
                        }),
                    ],
                });
            }
        }

        const tracks = search_result.playlist?.tracks ?? [search_result.tracks[0]];

        const added_tracks_to_queue_message = await command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: `${command_interaction.user}, adding ${tracks.length} track(s) to the queue...`,
                }),
            ],
        });

        // asynchronously add tracks to the queue to allow the first item to play
        (async () => {
            for (let i = 0; i < tracks.length; i++) {
                const insert_index = playnext ? i : queue.tracks.length;
                queue.insert(tracks[i], insert_index);
                await delay(5_000);
            }

            added_tracks_to_queue_message.delete();
        })();

        // wait for the queue to be populated
        while (!queue.tracks.length) await delay(10);

        if (!queue.playing) {
            await queue.play();
            queue.setVolume(VolumeManager.scaleVolume(50)); // this will force a sensible volume
        }
    },
});
