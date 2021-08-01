'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueryType } = require('discord-player');

const { AudioManager } = require('../common/audio_player');
const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'play',
    description: 'Displays a list of commands.',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
    options: [
        {
            type: 'STRING',
            name: 'query',
            description: 'the query to search',
            required: true,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
        Discord.Permissions.FLAGS.CONNECT,
        Discord.Permissions.FLAGS.SPEAK,
    ],
    context: 'GUILD_CHANNELS',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.defer();

        const player = (
            await AudioManager.fetchPlayer(command_interaction.guild_id)
        ) ?? (
            await AudioManager.createPlayer(discord_client, command_interaction.guild_id)
        );

        const query = command_interaction.options.get('query').value;

        const searchResult = await player.search(query, {
            requestedBy: command_interaction.user,
            searchEngine: QueryType.AUTO,
        }).catch(() => {});

        if (!searchResult || !searchResult.tracks.length) {
            return command_interaction.followUp({
                content: 'No results were found!',
            });
        }

        const queue = await player.createQueue(command_interaction.guildId, {
            metadata: command_interaction.channel
        });

        try {
            if (!queue.connection) {
                await queue.connect(command_interaction.member.voice.channelId);
            }
        } catch (error) {
            console.trace(`Failed to connect to the voice channel: ${error.message}`, error);

            player.deleteQueue(command_interaction.guildId);
            return command_interaction.followUp({
                content: 'Could not join your voice channel!',
            });
        }

        await command_interaction.followUp({
            content: `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`,
        });

        if (searchResult.playlist) {
            queue.addTracks(searchResult.tracks);
        } else {
            queue.addTrack(searchResult.tracks[0]);
        }

        if (!queue.playing) {
            await queue.play();
            await queue.setVolume(25);
        }
    },
});
