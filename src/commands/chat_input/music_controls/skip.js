'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../common/app/message');
const { AudioManager } = require('../../../common/app/audio');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
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
        await command_interaction.deferReply();

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const queue = player.getQueue(command_interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, nothing is playing right now!`,
                    }),
                ],
            });
        }

        /** @type {Discord.GuildMember} */
        const guild_member = command_interaction.member;

        const guild_member_voice_channel = guild_member.voice.channel;
        const bot_voice_channel = command_interaction.guild.me.voice.channel;

        if (guild_member_voice_channel.id !== bot_voice_channel.id) {
            return command_interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${command_interaction.user}, you must be in the same voice channel as me to skip.`,
                    }),
                ],
            });
        }

        queue.skip();

        command_interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: `${command_interaction.user}, skipped!`,
                }),
            ],
        });
    },
});
