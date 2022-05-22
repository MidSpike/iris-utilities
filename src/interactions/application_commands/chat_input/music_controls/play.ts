'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { createAudioResource, demuxProbe, entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';

import { getInfo as getYouTubeInfo } from 'ytdl-core';

import { exec as ytdl } from 'youtube-dl-exec';

import { delay } from '../../../../common/lib/utilities';

import { CustomEmbed } from '../../../../common/app/message';

import { RemoteTrack, MusicSubscription, music_subscriptions, MusicReconnaissance } from '../../../../common/app/music/music';

import { ClientInteraction, ClientCommandHelper } from '../../../../common/app/client_interactions';


//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'play',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'allows for playing audio resources',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'the query to search',
                required: true,
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.BOOLEAN,
                name: 'playnext',
                description: 'whether to play next',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('MUSIC_CONTROLS'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply({ ephemeral: false });

        const query = interaction.options.getString('query', true);
        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;
        const bot_voice_channel_id = interaction.guild.me!.voice.channelId;

        if (!guild_member_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            return interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to summon me or join my voice channel.`,
                    }),
                ],
            });
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    description: `${interaction.user}, searching for:\`\`\`\n${query}\n\`\`\``,
                }),
            ],
        });

        /** @type {MusicSubscription} */
        let music_subscription = music_subscriptions.get(interaction.guildId);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription(
                joinVoiceChannel({
                    channelId: guild_member_voice_channel_id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator as any, // to make typescript happy
                    selfDeaf: false,
                })
            );
            music_subscriptions.set(interaction.guildId, music_subscription);
        }

        // Make sure the connection is ready before processing the user's request
        try {
            await entersState(music_subscription.voice_connection, VoiceConnectionStatus.Ready, 10e3);
        } catch (error) {
            console.warn(error);

            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't connect to the voice channel.`,
                    }),
                ],
            });

            return;
        }

        const search_results = await MusicReconnaissance.search(query);

        if (search_results.length === 0) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, I couldn't find anything for **${query}**.`,
                    }),
                ],
            });

            return;
        }

        if (search_results.length > 1) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, added ${search_results.length} track(s) to the queue...`,
                    }),
                ],
            });
        }

        for (let i = 0; i < search_results.length; i++) {
            const insert_index = playnext ? i : music_subscription.queue.future_tracks.length;

            const search_result = search_results[i];

            try {
                let track_title = 'Unknown Track';
                let track_url = 'https://google.com/';

                const urlObj = new URL(search_result.url);
                if ((/(youtu\.be|youtube\.com)$/gi).test(urlObj.hostname)) {
                    const info = await getYouTubeInfo(`${urlObj}`);

                    track_title = info.videoDetails.title;
                    track_url = info.videoDetails.video_url;
                } else {
                    track_title = `Audio stream from ${urlObj.hostname}`;
                }

                const track = new RemoteTrack({
                    title: track_title,
                    url: track_url,
                }, async (track) => await new Promise((resolve, reject) => {
                    console.warn({
                        track,
                    });

                    const ytdl_process = ytdl(track.metadata.url!, {
                        o: '-',
                        q: '',
                        f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                        r: '100K',
                    } as any, {
                        stdio: [ 'ignore', 'pipe', 'ignore' ],
                    });

                    const stream = ytdl_process?.stdout;
                    if (!stream) {
                        reject(new Error('No stdout'));
                        return;
                    }

                    const onError = (error: unknown) => {
                        console.trace(error);

                        if (!ytdl_process.killed) ytdl_process.kill();
                        stream.resume();
                        reject(error);
                    };

                    ytdl_process.once('spawn', () => {
                        demuxProbe(stream).then((probe) => {
                            resolve(createAudioResource(probe.stream, {
                                inputType: probe.type,
                                inlineVolume: true, // allows volume to be adjusted while playing
                                metadata: track, // the track
                            }));
                        }).catch(onError);
                    }).catch(onError);
                }), {
                    onStart() {
                        // IMPORTANT: Initialize the volume interface
                        music_subscription!.queue.volume_manager.initialize();

                        interaction.followUp({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, is playing **[${track.metadata.title}](${track.metadata.url})**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onFinish() {
                        interaction.followUp({
                            embeds: [
                                CustomEmbed.from({
                                    description: `${interaction.user}, finished playing **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                    onError(error) {
                        console.trace(error);

                        interaction.followUp({
                            embeds: [
                                CustomEmbed.from({
                                    color: CustomEmbed.colors.RED,
                                    description: `${interaction.user}, failed to play **${track.metadata.title}**.`,
                                }),
                            ],
                        }).catch(console.warn);
                    },
                });

                // Add the track and reply a success message to the user
                music_subscription.queue.addTrack(track, insert_index);

                // Process the music subscription's queue
                await music_subscription.processQueue(false);

                await interaction.followUp({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, added **[${track.metadata.title}](${track.metadata.url})** to the queue.`,
                        }),
                    ],
                });
            } catch (error) {
                console.warn(error);
                await interaction.followUp({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.colors.RED,
                            description: `${interaction.user}, failed to add **${search_result.title}** to the queue.`,
                        }),
                    ],
                });
            }

            await delay(5_000);
        }
    },
});
