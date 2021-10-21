'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueryType } = require('discord-player');

const { delay } = require('../../common/lib/utilities');
const { CustomEmbed } = require('../../common/app/message');
const { AudioManager, VolumeManager } = require('../../common/app/audio');
const { ClientCommand, ClientCommandHandler } = require('../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'MESSAGE',
    name: 'add_to_queue',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
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

        const message = command_interaction.options.resolved.messages.first();

        if (message.author.system || message.author.bot) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, you can\'t play anything from a message sent by a bot or system account.`,
                    }),
                ],
            });
        }

        const query = message.cleanContent;

        if (!query.length) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, you can only use this command on messages that have content.`,
                    }),
                ],
            });
        }

        const queue = await AudioManager.createQueue(discord_client, command_interaction.guildId, {
            user: command_interaction.user,
            channel: command_interaction.channel,
        });

        const search_result = await queue.player.search(query, {
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

        const tracks = search_result.playlist?.tracks ?? [ search_result.tracks[0] ];

        if (tracks.length > 1) {
            await command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, adding ${tracks.length} track(s) to the queue...`,
                    }),
                ],
            });
        }

        // asynchronously add tracks to the queue to allow the first item to play
        (async () => {
            for (let i = 0; i < tracks.length; i++) {
                queue.insert(tracks[i], queue.tracks.length);
                await delay(5_000);
            }
        })();

        // wait for the queue to be populated
        while (!queue.tracks.length) await delay(10);

        if (!queue.playing) {
            await queue.play();
            queue.setVolume(queue.volume ?? VolumeManager.scaleVolume(50)); // this will force a sensible volume
        }
    },
});
