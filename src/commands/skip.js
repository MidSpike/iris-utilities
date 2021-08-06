'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { AudioManager } = require('../common/audio_player');
const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'skip',
    description: 'n/a',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
    options: [],
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

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const queue = player.getQueue(command_interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return command_interaction.followUp({
                content: 'Nothing is playing right now!',
            });
        }

        /** @type {Discord.GuildMember} */
        const guild_member = command_interaction.member;

        const guild_member_voice_channel = guild_member.voice.channel;
        const bot_voice_channel = command_interaction.guild.me.voice.channel;

        console.log({
            bot_voice_channel,
            guild_member_voice_channel,
        });

        if (guild_member_voice_channel.id !== bot_voice_channel.id) {
            return command_interaction.followUp({
                content: 'You must be in the same voice channel as me to skip.',
            });
        }

        queue.skip();

        command_interaction.followUp({
            content: `Skipped song!`,
        });
    },
});
