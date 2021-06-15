'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendConfirmationMessage } = require('../../libs/messages.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'REQUEST_HISTORY_DELETION',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 17,
    description: 'Allows the user to request their history to be deleted',
    aliases: ['request_history_deletion'],
    cooldown: 60_000,
    async executor(Discord, client, message, opts={}) {
        const confirmation_embed = new CustomRichEmbed({
            color: 0xFF00FF,
            description: 'Do you want to request for your stored user history to be deleted?',
        }, message);
        const yes_callback = async () => {
            client.shard.send({
                type: 'for_shard__logging_user_history_deletion_requests',
                message_author: message.author,
            });

            message.reply({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFF00FF,
                        title: 'Your user history will be removed within 48 hours!',
                        description: 'Keep in mind that essential data (such as ban records) will not be deleted!',
                    }, message),
                ],
            }).catch(console.warn);
        };
        const no_callback = () => {};
        sendConfirmationMessage(message.author.id, message.channel.id, true, {
            embeds: [
                confirmation_embed,
            ],
        }, yes_callback, no_callback);
    },
});
