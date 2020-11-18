'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'IMPOSTER',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'impersonate a user as a webhook',
    aliases: ['imposter', 'impostor'],
    access_level: DisBotCommand.access_levels.BOT_OWNER,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MANAGE_WEBHOOKS'])) return;

        const user = (await client.users.fetch(command_args[0]).catch(() => undefined)) ?? message.mentions.users.first();

        if (user) {
            const webhook = await message.channel.createWebhook(user.username, {
                avatar: user.displayAvatarURL({dynamic: true}),
            });
            await webhook.send(`${command_args.slice(1).join(' ')}`);
            await webhook.delete();
        } else {

        }
    },
});
