'use strict';

//------------------------------------------------------------//

const {
    Player: DiscordPlayer,
    QueryType: DiscordPlayerQueryType,
} = require('discord-player');

const Discord = require('discord.js');

const {
	AudioPlayerStatus,
	AudioResource,
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus,
} = require('@discordjs/voice');

const { delay } = require('../../../../common/lib/utilities');

const { CustomEmbed } = require('../../../../common/app/message');
const { Track, MusicSubscription, music_subscriptions } = require('../../../../common/app/music/music');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');


//------------------------------------------------------------//

module.exports = new ClientInteraction({
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

        await interaction.deferReply({ ephemeral: false });

        const query = interaction.options.getString('query', true);
        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        const guild_member_voice_channel_id = interaction.member.voice.channelId;
        const bot_voice_channel_id = interaction.guild.me.voice.channelId;

        if (!guild_member_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            return interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to summon me or join my voice channel.`,
                    }),
                ],
            });
        }

        await interaction.editReply({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, searched for:\`\`\`\n${query}\n\`\`\``,
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
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                })
            );
            music_subscription.voiceConnection.on('error', console.warn);
            music_subscriptions.set(interaction.guildId, music_subscription);
        }

        // Make sure the connection is ready before processing the user's request
        try {
            await entersState(music_subscription.voiceConnection, VoiceConnectionStatus.Ready, 10e3);
        } catch (error) {
            console.warn(error);
            return await interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't connect to the voice channel.`,
                    }),
                ],
            });
        }

        const player = new DiscordPlayer(discord_client);

        const search_result = await player.search(query, {
            searchEngine: DiscordPlayerQueryType.YOUTUBE_SEARCH,
        });

        const tracks = (search_result.playlist?.tracks ?? [ search_result.tracks[0] ]).filter(track => !!track);

        if (tracks.length === 0) {
            await interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, I couldn't find anything for **${query}**.`,
                    }),
                ],
            });
            return;
        }

        if (tracks.length > 1) {
            await interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, added ${tracks.length} track(s) to the queue...`,
                    }),
                ],
            });
        }

        // asynchronously add tracks to the queue to allow the first item to play
        (async () => {
            for (let i = 0; i < tracks.length; i++) {
                const insert_index = playnext ? i : music_subscription.queue.length;

                try {
                    // Attempt to create a Track from the user's video URL
                    const track = await Track.from(tracks[i].url, {
                        onStart() {
                            interaction.followUp({
                                embeds: [
                                    new CustomEmbed({
                                        description: `${interaction.user}, is playing **[${track.title}](${track.url})**.`,
                                    }),
                                ],
                            }).catch(console.warn);
                        },
                        onFinish() {
                            interaction.followUp({
                                embeds: [
                                    new CustomEmbed({
                                        description: `${interaction.user}, finished playing **${track.title}**.`,
                                    }),
                                ],
                            }).catch(console.warn);
                        },
                        onError(error) {
                            console.warn(error);
                            interaction.followUp({
                                embeds: [
                                    new CustomEmbed({
                                        color: CustomEmbed.colors.RED,
                                        description: `${interaction.user}, failed to play **${track.title}**.`,
                                    }),
                                ],
                            }).catch(console.warn);
                        },
                    });

                    // Add the track and reply a success message to the user
                    music_subscription.queue.addTrack(track, insert_index);

                    // Process the music subscription's queue
                    await music_subscription.processQueue();

                    await interaction.followUp({
                        embeds: [
                            new CustomEmbed({
                                description: `Added **[${track.title}](${track.url})** to the queue.`,
                            }),
                        ],
                    });
                } catch (error) {
                    console.warn(error);
                    await interaction.followUp({
                        embeds: [
                            new CustomEmbed({
                                color: CustomEmbed.colors.RED,
                                description: `${interaction.user}, failed to add **${tracks[i].title}** to the queue.`,
                            }),
                        ],
                    });
                }

                await delay(5_000);
            }
        })();
    },
});
