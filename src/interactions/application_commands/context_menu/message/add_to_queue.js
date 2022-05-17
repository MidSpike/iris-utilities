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

const { RemoteTrack, MusicSubscription, music_subscriptions, MusicReconnaissance } = require('../../../../common/app/music/music');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'Add To Queue',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.MESSAGE,
        description: '', // required for the command to be registered
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
    },
    async handler(discord_client, interaction) {
        if (!interaction.isContextMenu()) return;

        await interaction.deferReply({ ephemeral: false });

        const guild_member_voice_channel_id = interaction.member.voice.channelId;
        const bot_voice_channel_id = interaction.guild.me.voice.channelId;

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

        const message_id = interaction.options.resolved.messages.first().id;

        /** @type {Discord.Message} */
        const message = await interaction.channel.messages.fetch(message_id).catch(() => undefined);
        if (!message) {
            return interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't find the message.`,
                    }),
                ],
            });
        }

        if (message.author.system || message.author.bot) {
            return interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, you can\'t play anything from a message sent by a bot or system account.`,
                    }),
                ],
            });
        }

        const query = message.cleanContent;

        if (!query.length) {
            return interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        description: `${interaction.user}, you can only use this command on messages that have content.`,
                    }),
                ],
            });
        }

        /** @type {MusicSubscription} */
        let music_subscription = music_subscriptions.get(interaction.guildId);

        // If a connection to the guild doesn't already exist and the user is in a voice channel,
        // join that channel and create a subscription.
        if (!music_subscription || !bot_voice_channel_id) {
            music_subscription = new MusicSubscription(
                joinVoiceChannel({
                    channelId: guild_member_voice_channel_id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
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

        const music_reconnaissance = new MusicReconnaissance(discord_client);

        const search_results = await music_reconnaissance.search(query);

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
                    }));
                }).catch(onError);
            }).catch(onError);
        }), {
            onStart() {
                // IMPORTANT: Initialize the volume interface
                music_subscription.queue.volume_manager.initialize();

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
        music_subscription.queue.addTrack(track);

        // Process the music subscription's queue
        await music_subscription.processQueue(false);
    },
});
