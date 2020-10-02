'use strict';

const { Timer } = require('../../utilities.js');

const { client } = require('../../libs/bot.js');

const { isThisBot } = require('../../libs/permissions.js');

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'voiceStateUpdate',
    async callback(old_voice_state, new_voice_state) {
        if (client.$.restarting_bot) return;

        if (isThisBot(new_voice_state.member.id)) {
            if (new_voice_state.connection && new_voice_state.channel) {
                // Run if connected to a voice channel
                await Timer(500); // prevent API abuse
                if (new_voice_state.serverMute) new_voice_state.setMute(false, `Don't mute me!`);
                if (new_voice_state.serverDeaf) new_voice_state.setDeaf(false, `Don't deafen me!`);
            }
        }
    },
};
