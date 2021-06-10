'use strict';

//#region dependencies
const { math_clamp } = require('../../utilities.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isSuperPerson,
        isSuperPersonAllowed } = require('../../libs/permissions.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SUPERVOLUME',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'super volume',
    aliases: ['supervolume', 'sv'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;

        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'super_volume')) {
            sendNotAllowedCommand(message);
            return;
        }

        const bot_voice_channels = client.voice.connections.map(voice_connection => voice_connection.channel);
        const user_voice_channel = message.member.voice.channel;
        if (!bot_voice_channels.includes(user_voice_channel)) return; // the user is not in a voice channel with the bot

        const super_volume_input = command_args.join(' ');
        const parsed_super_volume_input = parseFloat(super_volume_input);
        if (isNaN(parsed_super_volume_input)) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: `\`${parsed_super_volume_input}\` is not a valid number!`,
                }, message),
            });
            return;
        }

        const clamped_super_volume_input = math_clamp(parsed_super_volume_input, 0, 10_000);

        const guild_dispatcher = client.$.dispatchers.get(message.guild.id);
        guild_dispatcher.setVolume(clamped_super_volume_input);

        message.channel.send({
            embed: new CustomRichEmbed({
                title: `Super Volume: ${(await constructNumberUsingEmoji(clamped_super_volume_input))}`,
            }, message),
        });
    },
});
