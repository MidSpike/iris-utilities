'use strict';

//------------------------------------------------------------//

const { exec: ytdl } = require('youtube-dl-exec');

const Discord = require('discord.js');

const {
    createAudioResource,
    demuxProbe,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
} = require('@discordjs/voice');

const { RemoteTrack, MusicSubscription, music_subscriptions, MusicReconnaissance } = require('../common/app/music/music');

const { CustomEmbed } = require('../common/app/message');

//------------------------------------------------------------//

module.exports = {
    name: 'speech',
    /**
     * @param {Discord.Client} discord_client
     * @param {{
     *  content: string?,
     *  channel: Discord.VoiceChannel?,
     *  author: Discord.User?,
     * }} msg
     */
    async handler(discord_client, msg) {
        if (!msg?.content?.length) return;

        console.log({
            voice_recognition: msg.content,
        });

        const voice_command_activation_regex = /^(\b(hey|a|play|yo|yellow|ok|okay|oi)\b\s)?\b(Ir(i?)s(h?)|Discord|Ziggy|Alexa|Google|Siri|Bixby|Cortana|Tesla)\b/gi;

        if (!voice_command_activation_regex.test(msg.content)) return;

        console.log({
            voice_command: {
                content: msg.content,
                author_id: msg.author?.id,
                voice_channel_id: msg.channel?.id,
            },
        });

        const author = msg.author;
        if (!author) return;

        /** @type {Discord.VoiceChannel} */
        const voice_channel = await discord_client.channels.fetch(msg.channel.id);
        if (!voice_channel) return;

        const guild = await voice_channel.guild.fetch();
        if (!guild) return;

        const guild_member = await guild.members.fetch(author.id);
        if (!guild_member) return;

        const guild_member_voice_channel_id = guild_member.voice.channelId;
        if (!guild_member_voice_channel_id) return;

        const bot_voice_channel_id = guild.me.voice.channelId;
        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) return;

        /** @type {string} */
        const user_input = msg.content.replace(voice_command_activation_regex, '').toLowerCase().trim();
        const user_input_args = user_input.split(/\s+/gi);

        const voice_command_name = user_input_args[0] ?? '';
        const voice_command_args = user_input_args.slice(1) ?? [];

        if (!voice_command_name.length) return;

        const voice_command_text_channel = discord_client.channels.cache.get('909136093516029972');

        /** @type {MusicSubscription} */
        let music_subscription = music_subscriptions.get(guild.id);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription(
                joinVoiceChannel({
                    channelId: voice_channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: false,
                })
            );
            music_subscriptions.set(guild.id, music_subscription);
        }

        // Make sure the connection is ready before processing the user's request
        try {
            await entersState(music_subscription.voice_connection, VoiceConnectionStatus.Ready, 10e3);
        } catch (error) {
            console.warn(error);

            return;
        }

        await voice_command_text_channel.send({
            embeds: [
                new CustomEmbed({
                    title: 'Voice Command',
                    description: `${msg.author.username} said:\`\`\`\n${voice_command_name} ${voice_command_args.join(' ')}\n\`\`\``,
                }),
            ],
        }).catch(console.warn);

        switch (voice_command_name) {
            case 'by': // this is needed b/c google sometimes picks up 'by' instead of 'play'
            case 'hey': // this is needed b/c google sometimes picks up 'hey' instead of 'play'
            case 'play': {
                const search_query = voice_command_args.join(' ');

                const music_reconnaissance = new MusicReconnaissance(discord_client);

                const search_results = await music_reconnaissance.search(search_query);

                if (search_results.length === 0) return;

                const search_result = search_results.at(0);

                const track = new RemoteTrack({
                    title: search_result.title,
                    url: search_result.url,
                }, async (track) => await new Promise((resolve, reject) => {
                    console.warn({
                        track,
                    });

                    const process = ytdl(track.metadata.url, {
                        o: '-',
                        q: '',
                        f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                        r: '100K',
                    }, {
                        stdio: [ 'ignore', 'pipe', 'ignore' ],
                    });

                    const stream = process?.stdout;
                    if (!stream) {
                        reject(new Error('No stdout'));
                        return;
                    }

                    const onError = (error) => {
                        console.trace(error);

                        if (!process.killed) process.kill();
                        stream.resume();
                        reject(error);
                    };

                    process.once('spawn', () => {
                        demuxProbe(stream).then((probe) => {
                            resolve(createAudioResource(probe.stream, {
                                inputType: probe.type,
                                inlineVolume: true, // allows volume to be adjusted while playing
                                metadata: track, // the track
                            }))
                        }).catch(onError);
                    }).catch(onError);
                }), {
                    onStart() {
                        // IMPORTANT: Initialize the volume interface
                        music_subscription.queue.volume_manager.initialize();

                        voice_command_text_channel.send({
                            embeds: [
                                new CustomEmbed({
                                    description: `${msg.author}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onFinish() {
                        voice_command_text_channel.send({
                            embeds: [
                                new CustomEmbed({
                                    description: `${msg.author}, finished playing **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onError(error) {
                        console.trace(error);

                        voice_command_text_channel.send({
                            embeds: [
                                new CustomEmbed({
                                    color: CustomEmbed.colors.RED,
                                    description: `${msg.author}, failed to play **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                });

                // Add the track and reply a success message to the user
                music_subscription.queue.addTrack(track);

                // Process the music subscription's queue
                await music_subscription.processQueue(false);

                break;
            }

            case 'vol': // this is needed b/c google sometimes picks up 'vol' instead of 'volume'
            case 'volume': {
                const volume_input = Number.parseInt(voice_command_args[0], 10);

                if (Number.isNaN(volume_input)) return;

                const minimum_allowed_volume = 0;
                const maximum_allowed_volume = 100;
                const volume_level = Math.max(minimum_allowed_volume, Math.min(volume_input, maximum_allowed_volume));

                music_subscription.queue.volume_manager.volume = volume_level;

                break;
            }

            case 'skit': // this is needed b/c google sometimes picks up 'skit' instead of 'skip'
            case 'skin': // this is needed b/c google sometimes picks up 'skin' instead of 'skip'
            case 'skip': {
                music_subscription.processQueue(true);

                break;
            }

            case 'star': // this is needed b/c google sometimes picks up 'star' instead of 'stop'
            case 'stop': {
                await music_subscription.kill();

                break;
            }

            default: {
                break;
            }
        }
    },
};
