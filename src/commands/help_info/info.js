'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { getReadableTime } = require('../../utilities.js');

const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { findCustomEmoji } = require('../../libs/emoji.js');
//#endregion dependencies

const bot_website = bot_config.WEBSITE;
const bot_github = bot_config.GITHUB;
const bot_version = bot_config.PUBLIC_VERSION;
const bot_common_name = bot_config.COMMON_NAME;
const bot_long_name = bot_config.LONG_NAME;
const bot_owner_discord_id = bot_config.OWNER_ID;
const super_people = bot_config.SUPER_PEOPLE;

const bot_special_text_channels = bot_config.SPECIAL_CHANNELS.filter(special_channel => special_channel.type === 'text');

module.exports = new DisBotCommand({
    name: 'INFO',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 11,
    description: 'invites the developer to the server',
    aliases: ['info'],
    cooldown: 5_000,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix } = opts;

        const bot_emoji = await findCustomEmoji('bot_emoji_bot');
        const midspike_emoji = await findCustomEmoji('bot_emoji_midspike');

        const distributed_people_music_listener_count = await client.shard.broadcastEval(`
            this.voice.connections.map(connection => 
                connection.channel.members.filter(member => !member.user.bot).size
            ).reduce((accumulator, amount_of_people) => accumulator + amount_of_people, 0) ?? 0;
        `);
        const total_people_music_listener_count = distributed_people_music_listener_count.reduce((accumulator, people_count) => accumulator + people_count, 0);
        const distributed_bot_music_listener_count = await client.shard.broadcastEval(`
            this.voice.connections.map(connection => 
                connection.channel.members.filter(member => member.user.bot && member.user.id !== this.user.id).size
            ).reduce((accumulator, amount_of_bots) => accumulator + amount_of_bots, 0) ?? 0;
        `);
        const total_bot_music_listener_count = distributed_bot_music_listener_count.reduce((accumulator, bot_count) => accumulator + bot_count, 0);

        const distributed_people_count = await client.shard.broadcastEval('this.users.cache.filter((user) => !user.bot).size');
        const total_people_count = distributed_people_count.reduce((accumulator, people_count) => accumulator + people_count, 0);

        const distributed_bot_count = await client.shard.broadcastEval('this.users.cache.filter((user) => user.bot).size');
        const total_bot_count = distributed_bot_count.reduce((accumulator, bot_count) => accumulator + bot_count, 0);

        const distributed_guild_count = await client.shard.fetchClientValues('guilds.cache.size');
        const total_guild_count = distributed_guild_count.reduce((accumulator, guild_count) => accumulator + guild_count, 0);

        const special_channels_usage_totals = await Promise.all(bot_special_text_channels.map(async (special_channel) => {
            const distributed_special_channel_usage_total = await client.shard.broadcastEval(`this.channels.cache.filter(channel => channel.name === '${special_channel.name}').size`);
            const special_channel_usage_total = distributed_special_channel_usage_total.reduce((accumulator, special_channel_count) => accumulator + special_channel_count, 0);
            return {
                channel_name: special_channel.name,
                usage_total: special_channel_usage_total,
            };
        }));

        message.channel.send(new CustomRichEmbed({
            title: 'Hi There!',
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
                    name: 'My Shards',
                    value: `${client.shard.count} shards online`,
                }, {
                    name: 'My Shard\'s ID',
                    value: `I am using shard ${client.$._shard_id}`,
                }, {
                    name: 'My Shard\'s Ping To Discord',
                    value: `${client.ws.ping}ms`,
                }, {
                    name: 'My Creation Date',
                    value: `${client.user.createdAt}`,
                }, {
                    name: 'My Uptime',
                    value: `${getReadableTime(client.uptime / 1000)} (hours : minutes : seconds)`,
                }, {
                    name: 'The Number Of People Listening To Music',
                    value: `${total_people_music_listener_count} ${total_people_music_listener_count === 1 ? 'person is' : 'people are'} listening to music`,
                }, {
                    name: 'The Number Of Bots Listening To Music',
                    value: `${total_bot_music_listener_count} ${total_bot_music_listener_count === 1 ? 'bot is' : 'bots are'} listening to music`,
                }, {
                    name: 'The Number Of People I Know',
                    value: `${total_people_count} People`,
                }, {
                    name: 'The Number Of Bots I Know',
                    value: `${total_bot_count} Bots`,
                }, {
                    name: 'The Number Of Guilds I\'m In',
                    value: `${total_guild_count} Guilds`,
                }, {
                    name: 'The Special Text Channels Usage',
                    value: `${special_channels_usage_totals.map(({ channel_name, usage_total }) => `\`${channel_name}\` - ${usage_total} Guilds`).join('\n')}`,
                }, {
                    name: 'The Legal Disclaimer',
                    value: `Use \`${command_prefix}disclaimer\` for information regarding your privacy and safety.`,
                },
            ],
        }, message));
    },
});
