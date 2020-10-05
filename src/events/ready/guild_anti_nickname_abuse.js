'use strict';

const { Timer } = require('../../utilities.js');

const { client } = require('../../libs/bot.js');

//---------------------------------------------------------------------------------------------------------------//

async function stopDisplayNameAbusers() {
    console.time('stopDisplayNameAbusers()');
    for (const guild of client.guilds.cache.values()) {
        if (!guild.available) continue;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(guild.id);
        if (!guild_config.beta_programs.includes('ANTI_NICKNAME_ABUSE')) continue;

        if (guild.partial) await guild.fetch().catch(console.warn);

        // console.log(`${guild.name} (${guild.id}) is using ANTI_NICKNAME_ABUSE`);

        for (const member of guild.members.cache.values()) {
            if (guild.ownerID === member.id) continue; // this feature wont work on a guild owner

            const is_suspicious_display_name = member.displayName.startsWith('!');
            if (!is_suspicious_display_name) continue; // the user has a 'normal' displayName

            await member.setNickname('Invalid DisplayName', 'A suspicious display name was detected and was changed!').catch(console.warn);

            await Timer(250); // prevent api abuse
        }
    }
    console.timeEnd('stopDisplayNameAbusers()');
}

module.exports = {
    event_name: 'ready',
    async callback() {
        client.setInterval(stopDisplayNameAbusers, 1000 * 60 * 15); // every 15 minutes
    }
};
