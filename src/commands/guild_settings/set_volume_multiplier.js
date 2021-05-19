'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SET_VOLUME_MULTIPLIER',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 11,
    description: 'sets volume multiplier',
    aliases: ['set_volume_multiplier'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        const guild_volume_manager = client.$.volume_managers.get(message.guild.id);

        const old_volume_multiplier = guild_config.volume_multiplier ?? 1;
        const parsed_volume_multiplier = parseFloat(command_args[0]);
        const new_volume_multiplier = parsed_volume_multiplier;

        if (Number.isNaN(parsed_volume_multiplier)) {
            message.channel.send([
                'Please provide a number after the command next time!',
                '',
                'Examples:',
                `${'```'}`,
                `${discord_command} 0.5`,
                `${'```'}`,

                `${'```'}`,
                `${discord_command} 1`,
                `${'```'}`,

                `${'```'}`,
                `${discord_command} 2.0`,
                `${'```'}`,
            ].join('\n')).catch(console.warn);
            return;
        }

        if (new_volume_multiplier < 0.1 || new_volume_multiplier > 100) {
            message.channel.send('Please provide a number greater than or equal to \`0.1\` and less than or equal to \`100\` next time!').catch(console.warn);
            return;
        }

        message.channel.send(new CustomRichEmbed({
            title: 'Setting New Volume Multiplier',
            description: [
                'Old Server Volume Multiplier:',
                `${'```'}`,
                `${old_volume_multiplier}`,
                `${'```'}`,

                'New Server Volume Multiplier:',
                `${'```'}`,
                `${new_volume_multiplier}`,
                `${'```'}`,
            ].join('\n'),
        }, message)).catch(console.warn);

        client.$.guild_configs_manager.updateConfig(message.guild.id, {
            volume_multiplier: new_volume_multiplier,
        });

        guild_volume_manager.setVolume(guild_volume_manager.last_volume);
    },
});
