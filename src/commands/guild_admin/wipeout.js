'use strict';

//#region dependencies
const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendConfirmationMessage } = require('../../libs/messages.js');
const { botHasPermissionsInGuild } = require('../../libs/permissions.js');
const { logUserError } = require('../../libs/permissions.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name:'WIPEOUT',
    category:`${DisBotCommander.categories.GUILD_ADMIN}`,
    description:'Wipeout a text-channel',
    aliases:['wipeout'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command } = opts;
        if (!botHasPermissionsInGuild(message, ['MANAGE_CHANNELS'])) return;
        sendConfirmationMessage(message.author.id, message.channel.id, false, new CustomRichEmbed({
            title:'Be very careful!',
            description:[
                `**This command will clone this channel and then delete the old one!**`,
                `**You will lose all messages in this channel!**`,
                `\n*(Check out the \`${command_prefix}archive\` command for a less-destructive method of cleaning-up!)*\n`,
                `**Do you wish to continue?**`
            ].join('\n')
        }), async () => {
            if (message.guild.publicUpdatesChannel?.id === message.channel.id) {
                logUserError(message, new Error('Unable to delete community updates channel!'));
                return;
            }
            const cloned_channel = await message.channel.clone({
                reason: `Created using ${discord_command} by @${message.author.tag}`,
            });
            await cloned_channel.setParent(message.channel.parent);
            await cloned_channel.setPosition(message.channel.position + 1);
            await Timer(1500); // this is needed
            message.channel.delete({
                reason: `Deleted using ${discord_command} by @${message.author.tag}`,
            }).catch(error => console.warn(`Unable to delete channel`, error));
        }, async (bot_message) => {
            await bot_message.delete().catch(error => console.warn(`Unable to delete message`, error));
            message.channel.send(new CustomRichEmbed({title:'Canceled wipeout!'}, message));
        });
    },
});
