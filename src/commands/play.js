'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueryType } = require('discord-player');

const { AudioManager } = require('../common/audio_player');
const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'play',
    description: 'n/a',
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
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.defer();

        const query = command_interaction.options.get('query').value;

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const search_result = await player.search(query, {
            requestedBy: command_interaction.user,
            searchEngine: QueryType.AUTO,
        }).catch(() => {});

        if (!search_result?.tracks?.length) {
            return command_interaction.followUp({
                content: `${command_interaction.user}`,
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
                content: `${command_interaction.user}, I was unable to join your voice channel!`,
            });
        }

        const tracks = search_result.playlist?.tracks ?? [search_result.tracks[0]];

        await command_interaction.followUp({
            content: `${command_interaction.user}, adding ${tracks.length} track(s) to the queue...`,
        });

        queue.addTracks(tracks);

        if (!queue.playing) {
            await queue.play();
            queue.setVolume(AudioManager.scaleVolume(50)); // this will force a sensible volume
        }
    },
});
