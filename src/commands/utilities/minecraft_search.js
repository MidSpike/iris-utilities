'use strict';

//#region local dependencies
const axios = require('axios');
const moment = require('moment-timezone');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'MINECRAFT_SEARCH',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 8,
    description: 'search minecraft for stuff',
    aliases: ['minecraft_search', 'mc_search'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (['user'].includes(command_args[0])) {
            const search_query = command_args.slice(2).join(' ');
            const mc_user_api_response = await axios.get(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(search_query)}`).catch(() => {});
            const mc_user_api_response_data = mc_user_api_response?.data;

            const mc_user_uuid = mc_user_api_response_data?.data?.player?.id;
            const mc_user_username = mc_user_api_response_data?.data?.player?.username;
            const mc_user_name_history = mc_user_api_response_data?.data?.player?.meta?.name_history;

            function mc_user_exists() {
                if (!mc_user_uuid) {
                    message.channel.send(new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: `Well that\'s an issue...`,
                        description: `I can\'t find a user by the name of **${Discord.Util.escapeMarkdown(search_query)}**!`,
                    }, message)).catch(console.warn);
                    return false;
                } else {
                    return true;
                }
            }

            if (['profile'].includes(command_args[1])) {
                if (!mc_user_exists()) return;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_body_image = `https://crafatar.com/renders/body/${encodeURIComponent(mc_user_uuid)}?overlay=true`;

                message.channel.send(new CustomRichEmbed({
                    title: `${mc_user_username}`,
                    description: `${mc_user_uuid}`,
                    fields: [
                        {
                            name: 'Username History',
                            value: mc_user_name_history.map(entry => `- ${entry?.name} (${moment(entry?.changedToAt)})`).join('\n'),
                        },
                    ],
                    thumbnail: mc_avatar_image,
                    image: mc_body_image,
                }, message)).catch(console.warn);
            } else if (['skin'].includes(command_args[1])) {
                if (!mc_user_exists()) return;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_skin_image = `https://crafatar.com/skins/${encodeURIComponent(mc_user_uuid)}`;

                message.channel.send(new CustomRichEmbed({
                    title: `${mc_user_username}`,
                    description: `${mc_user_uuid}`,
                    thumbnail: mc_avatar_image,
                    image: mc_skin_image,
                }, message)).catch(console.warn);
            } else if (['cape'].includes(command_args[1])) {
                if (!mc_user_exists()) return;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_cape_image = `https://crafatar.com/capes/${encodeURIComponent(mc_user_uuid)}`;

                message.channel.send(new CustomRichEmbed({
                    title: `${mc_user_username}`,
                    description: `${mc_user_uuid}`,
                    thumbnail: mc_avatar_image,
                    image: mc_cape_image,
                }, message)).catch(console.warn);
            } else {
                message.channel.send(new CustomRichEmbed({
                    title: 'Usage details below!',
                    description: [
                        `Usage: \`${discord_command} user [ profile | skin | cape ] <username>\``,
                        `Example: \`${discord_command} user profile Notch\``,
                    ].join('\n'),
                }, message)).catch(console.warn);
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                title: 'Usage details below!',
                description: `Usage: \`${discord_command} user\``,
            }, message)).catch(console.warn);
        }
    },
});
