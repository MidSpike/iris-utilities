'use strict';

//#region local dependencies
const { getReadableTime } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { findCustomEmoji } = require('../../libs/emoji.js');

const bot_config = require('../../../config.js');
//#endregion local dependencies

const bot_website = bot_config.WEBSITE;
const bot_github = bot_config.GITHUB;
const bot_version = bot_config.PUBLIC_VERSION;
const bot_common_name = bot_config.COMMON_NAME;
const bot_long_name = bot_config.LONG_NAME;
const bot_owner_discord_id = bot_config.OWNER_ID;
const super_people = bot_config.SUPER_PEOPLE;

const bot_special_text_channels = bot_config.SPECIAL_CHANNELS.filter(special_channel => special_channel.type === 'text');

module.exports = new DisBotCommand({
    name:'INFO',
    category:`${DisBotCommander.categories.HELP_INFO}`,
    weight:11,
    description:'invites the developer to the server',
    aliases:['info'],
    async executor(Discord, client, message, opts={}) {
        const { command_prefix } = opts;
        const bot_emoji = findCustomEmoji('bot_emoji_bot');
        const midspike_emoji = findCustomEmoji('bot_emoji_midspike');
        const people_music_listeners = client.voice.connections.map(connection => connection.channel.members.filter(member => !member.user.bot).size).reduce((a, b) => a + b, 0) ?? 0;
        const bot_music_listeners = client.voice.connections.map(connection => connection.channel.members.filter(member => member.user.bot && member.user.id !== client.user.id).size).reduce((a, b) => a + b, 0) ?? 0;
        message.channel.send(new CustomRichEmbed({
            title: `Hi There!`,
            description: `I\'m **${bot_common_name}**, the *${bot_long_name}*, a general purpose music & utility discord bot that is here to help.`,
            fields: [
                {
                    name: 'Me',
                    value: `${bot_emoji} @${client.user.tag}`,
                }, {
                    name: 'My Developer',
                    value: `${midspike_emoji} @${client.users.cache.get(bot_owner_discord_id).tag}`,
                }, {
                    name: 'My Admins',
                    value: `${super_people.filter(super_person => super_person.public).map(super_person => super_person.name).join('\n')}`,
                }, {
                    name: 'My Website',
                    value: `${bot_website}`,
                }, {
                    name: 'My GitHub',
                    value: `${bot_github}`,
                }, {
                    name: 'My Version',
                    value: `${bot_version}`,
                }, {
                    name: 'My Ping To Discord',
                    value: `${client.ws.ping}ms`,
                }, {
                    name: 'My Creation Date',
                    value: `${client.user.createdAt}`,
                }, {
                    name: 'My Uptime',
                    value: `${getReadableTime(client.uptime / 1000)} (hours : minutes : seconds)`,
                }, {
                    name: `The Number Of People Listening To Music`,
                    value: `${people_music_listeners} ${people_music_listeners === 1 ? 'person is' : 'people are'} listening to music`,
                }, {
                    name: `The Number Of Bots Listening To Music`,
                    value: `${bot_music_listeners} ${bot_music_listeners === 1 ? 'bot is' : 'bots are'} listening to music`,
                }, {
                    name: `The Number Of People I Know`,
                    value: `${client.users.cache.filter(user => !user.bot).size} People`,
                }, {
                    name: `The Number Of Bots I Know`,
                    value: `${client.users.cache.filter(user => user.bot).size} Bots`,
                }, {
                    name: `The Number Of Guilds I\'m In`,
                    value: `${client.guilds.cache.size} Guilds`,
                }, {
                    name: 'The Special Channels Usage',
                    value: `${bot_special_text_channels.map(special_channel => `\`${special_channel.name}\` - ${client.channels.cache.filter(channel => channel.name === special_channel.name).size} Guilds`).join('\n')}`,
                }, {
                    name: 'The Legal Disclaimer',
                    value: `Use \`${command_prefix}disclaimer\` for information regarding your privacy and safety.`,
                },
            ],
        }, message));
    },
});
