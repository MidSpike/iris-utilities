'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SET_VOLUME_MAXIMUM',
    category: `${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight: 10,
    description: 'sets volume maximum',
    aliases: ['set_volume_maximum'],
    access_level: DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        const guild_volume_manager = client.$.volume_managers.get(message.guild.id);

        const old_volume_maximum = guild_config.volume_maximum ?? 200;
        const parsed_volume_maximum = parseFloat(command_args[0]);
        const new_volume_maximum = parsed_volume_maximum;

        if (Number.isNaN(parsed_volume_maximum)) {
            message.channel.send([
                'Please provide a number after the command next time!',
                '',
                'Examples:',
                `${'```'}`,
                `${discord_command} 100`,
                `${'```'}`,

                `${'```'}`,
                `${discord_command} 250`,
                `${'```'}`,

                `${'```'}`,
                `${discord_command} 500`,
                `${'```'}`,
            ].join('\n')).catch(console.warn);
            return;
        }

        if (new_volume_maximum < 100 || new_volume_maximum > 1_000_000_000) {
            message.channel.send('Please provide a number greater than or equal to \`100\` and less than or equal to \`1_000_000_000\` next time!').catch(console.warn);
            return;
        }

        message.channel.send(new CustomRichEmbed({
            title: 'Setting New Maximum Volume',
            description: [
                'Old Server Maximum Volume:',
                `${'```'}`,
                `${old_volume_maximum}`,
                `${'```'}`,

                'New Server Maximum Volume:',
                `${'```'}`,
                `${new_volume_maximum}`,
                `${'```'}`,
            ].join('\n'),
        }, message)).catch(console.warn);

        client.$.guild_configs_manager.updateConfig(message.guild.id, {
            volume_maximum: new_volume_maximum,
        });

        guild_volume_manager.setVolume(guild_volume_manager.last_volume);
    },
});
