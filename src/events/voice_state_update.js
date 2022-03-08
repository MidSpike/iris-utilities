'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../common/app/message');

const { AudioManager } = require('../common/app/audio');

//------------------------------------------------------------//

module.exports = {
    name: 'voiceStateUpdate',
    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.VoiceState} old_voice_state
     * @param {Discord.VoiceState} new_voice_state
     */
    async handler(discord_client, old_voice_state, new_voice_state) {
        const is_same_member_id = old_voice_state.id === new_voice_state.id;
        if (!is_same_member_id) return; // this should never happen but just in-case

        const is_client_user = old_voice_state.id === discord_client.user.id && new_voice_state.id === discord_client.user.id;
        if (!is_client_user) return; // don't respond to other user events

        const client_user_has_left_voice_channel = old_voice_state.channelId && !new_voice_state.channelId;
        if (!client_user_has_left_voice_channel) return; // only continue if the client user has left a voice channel

        const guild_id = old_voice_state.guild.id;
        if (!guild_id) return; // this should never happen but just in-case

        const queue = await AudioManager.fetchQueue(discord_client, guild_id);
        if (!queue?.connection) return; // only continue if the queue connection exists

        console.warn('queue exists!');

        // /** @type {Discord.TextChannel} */
        // const text_channel = queue.metadata.channel;
        // if (!text_channel) return; // only continue if the text channel exists

        queue.destroy(); // destroy the queue
    },
};
