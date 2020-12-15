'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendConfirmationMessage } = require('../../libs/messages.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'NUKE_GUILD',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'allows you to nuke everything inside of your server',
    aliases: ['nuke_guild', 'nuke_server'],
    cooldown: 60_000,
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const confirmation_embed = new CustomRichEmbed({
            color: 0xFF00FF,
            title: 'Are you absolutely certain that you want to nuke your guild?',
            description: [
                'This command holds the power for guild owners to nuke / delete / remove everything in their guild!',
                '\n**Do you want to remove everything in your guild?**',
                'If you say **yes**, all (roles, channels, members, etc) in this guild will be nuked.',
                'If you say **no**, then nothing will be touched.',
            ].join('\n'),
        }, message);
        const yes_callback = async () => {
            const confirmation_timestamp = `${Date.now()}`.slice(7);

            const captcha_code = (new Buffer.from(confirmation_timestamp)).toString('base64');
            const captcha_code_bot_message = await message.channel.send(new CustomRichEmbed({
                color: 0xFF00FF,
                title: 'You must send the CAPTCHA below to continue!',
                description: `${'```'}\n${captcha_code}\n${'```'}`,
            }, message)).catch(console.warn);

            const message_collection_filter = (collected_message) => collected_message.author.id === message.author.id && collected_message.cleanContent === captcha_code;
            const message_collector = captcha_code_bot_message.channel.createMessageCollector(message_collection_filter, { max: 1, time: 60_000 });
            message_collector.on('collect', () => {
                // collected
            });
        };
        const no_callback = () => {};
        sendConfirmationMessage(message.author.id, message.channel.id, true, confirmation_embed, yes_callback, no_callback);
    },
});
