'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueueRepeatMode } = require('discord-player');

const { AudioManager } = require('../../../common/app/audio');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

/**
 * Parses seconds from a timestamp string in the format of [hh:][mm:]ss.
 * @param {String} timestamp (example: 'hh:mm:ss')
 * @returns {Number}
 */
function parseSecondsFromTimestamp(timestamp) {
    const [ ss, mm, hh ] = timestamp.split(':').reverse();
    const seconds = Number.parseInt(ss) || 0;
    const minutes = Number.parseInt(mm) || 0;
    const hours = Number.parseInt(hh) || 0;
    return (hours * 3600) + (minutes * 60) + (seconds);
}

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'seek',
    description: 'n/a',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
    options: [
        {
            type: 'STRING',
            name: 'timestamp',
            description: 'the timestamp to seek to',
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
        await command_interaction.deferReply();

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const queue = player.getQueue(command_interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return command_interaction.followUp({
                content: `${command_interaction.user}, nothing is playing right now!`,
            });
        }

        /** @type {Discord.GuildMember} */
        const guild_member = command_interaction.member;

        const guild_member_voice_channel = guild_member.voice.channel;
        const bot_voice_channel = command_interaction.guild.me.voice.channel;

        if (guild_member_voice_channel.id !== bot_voice_channel.id) {
            return command_interaction.followUp({
                content: `${command_interaction.user}, you must be in the same voice channel as me.`,
            });
        }

        const timestamp = command_interaction.options.get('timestamp').value;

        const time_in_seconds = parseSecondsFromTimestamp(timestamp);

        queue.seek(timestamp);

        command_interaction.followUp({
            content: `${command_interaction.user}, seeked to **${time_in_seconds} seconds**.`,
        });
    },
});
