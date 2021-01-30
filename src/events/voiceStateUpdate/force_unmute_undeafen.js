'use strict';

const { Timer } = require('../../utilities.js');

const { client } = require('../../libs/discord_client.js');

const { isThisBot } = require('../../libs/permissions.js');

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'voiceStateUpdate',
    async callback(old_voice_state, new_voice_state) {
        if (client.$.restarting_bot) return;
        if (client.$.lockdown_mode) return;

        if (isThisBot(new_voice_state.member.id)) {
            if (new_voice_state.connection && new_voice_state.channel) {
                /* run if connected to a voice channel */
                await Timer(1000); // prevent API abuse
                if (new_voice_state.serverMute) {
                    new_voice_state.setMute(false, 'Don\'t mute me!');
                }
                if (new_voice_state.serverDeaf) {
                    new_voice_state.setDeaf(false, 'Don\'t deafen me!');
                }
            }
        }
    },
};
