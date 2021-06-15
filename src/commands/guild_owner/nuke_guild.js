'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendCaptchaMessage,
        sendConfirmationMessage } = require('../../libs/messages.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

async function nuke_guild(message, guild) {
    //#region guild members
    /* prune guild members first to reduce the number of kicks */
    // guild.members.prune({
    //     dry: false,
    //     days: 1,
    //     roles: Array.from(guild.roles.cache.values()),
    // });

    /* kick the remaining guild members after pruning */
    const guild_members = await guild.members.fetch();
    for (const guild_member of guild_members.values()) {
        if (guild_member.kickable) {
            console.log(`${guild_member.displayName}`);
            // guild_member.kick(`${message.author.tag} (${message.author.id}) requested to nuke the guild!`).catch(console.warn);
            await Timer(2_500);
        }
    }
    //#endregion guild members

    //#region guild roles
    const guild_roles = await guild.roles.fetch();
    for (const guild_role of guild_roles.cache.values()) {
        if (guild_role.editable && guild_role.id !== guild_roles.everyone) {
            console.log(`${guild_role.name}`);
            // guild_role.delete(`${message.author.tag} (${message.author.id}) requested to nuke the guild!`).catch(console.warn);
            await Timer(2_500);
        }
    }
    //#endregion guild roles

    //#region guild channels
    const guild_channels = await guild.channels.cache;
    for (const guild_channel of guild_channels) {
        if (guild_channel.deletable) {
            console.log(`${guild_channel.name}`);
            // guild_channel.delete(`${message.author.tag} (${message.author.id}) requested to nuke the guild!`).catch(console.warn);
            await Timer(2_500);
        }
    }
    //#endregion guild channels

    //#region guild emojis
    const guild_emojis = await guild.emojis.cache;
    for (const guild_emoji of guild_emojis) {
        if (guild_emoji.deletable) {
            console.log(`${guild_emoji.name}`);
            // guild_emoji.delete(`${message.author.tag} (${message.author.id}) requested to nuke the guild!`).catch(console.warn);
            await Timer(2_500);
        }
    }
    //#endregion guild emojis
}

module.exports = new DisBotCommand({
    name: 'NUKE_GUILD',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'allows you to nuke (remove) everything inside of your guild',
    aliases: ['nuke_guild', 'nuke_server'],
    cooldown: 60_000,
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const confirmation_embed = new CustomRichEmbed({
            color: 0xFF00FF,
            title: 'Are you absolutely certain that you want to nuke your guild?',
            description: [
                '**This command holds the power for guild owners to nuke / delete / remove everything in their guild!**',
                `\n**_For best results, move the ${bot_config.COMMON_NAME} role to the top of the roles list!_**`,
                '\n**Do you want to remove everything in your guild?**',
                'If you say **yes**, all (members, roles, channels, emojis) in this guild will be nuked (removed).',
                'If you say **no**, then nothing will be touched.',
            ].join('\n'),
        }, message);
        const yes_callback = async () => {
            sendCaptchaMessage(message.author.id, message.channel.id, async (bot_captcha_message, collected_message) => {
                await bot_captcha_message.delete().catch(console.warn);
                await collected_message.delete().catch(console.warn);
                await message.reply('The captcha code was recognized!').catch(console.warn);
                await Timer(5_000);
                nuke_guild(message, message.guild);
            });
        };
        const no_callback = () => {};
        sendConfirmationMessage(message.author.id, message.channel.id, true, {
            embeds: [
                confirmation_embed,
            ],
        }, yes_callback, no_callback);
    },
});
